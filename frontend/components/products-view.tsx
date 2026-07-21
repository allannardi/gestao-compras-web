"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createCategory,
  fetchCategories,
  fetchMergeCandidates,
  fetchProducts,
  mergeProducts,
  reclassifyProducts,
  updateProduct,
} from "@/services/produtos";
import type {
  CategoriaResumo,
  ProdutoCandidatosMesclagem,
  ProdutoMesclagemResumo,
  ProdutoResumo,
} from "@/types/produtos";

type Props = {
  apiUrl: string;
  accessToken: string;
  canMergeProducts: boolean;
  onAddPurchase: () => void;
};

type LoadState = "loading" | "ready" | "error";

const PAGE_SIZE = 20;

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
});

function formatDate(value: string | null): string {
  if (!value) return "Sem histórico";

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(year, month - 1, day),
  );
}

export function ProductsView({
  apiUrl,
  accessToken,
  canMergeProducts,
  onAddPurchase,
}: Props) {
  const [products, setProducts] = useState<ProdutoResumo[]>([]);
  const [categories, setCategories] = useState<CategoriaResumo[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [total, setTotal] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [classifiedCount, setClassifiedCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);

  const [searchDraft, setSearchDraft] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [onlyReviewDraft, setOnlyReviewDraft] = useState(false);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCategory, setAppliedCategory] = useState("");
  const [appliedOnlyReview, setAppliedOnlyReview] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editUnit, setEditUnit] = useState("un");
  const [editCategory, setEditCategory] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [editError, setEditError] = useState("");

  const [mergeProductId, setMergeProductId] = useState<string | null>(null);
  const [mergeData, setMergeData] = useState<ProdutoCandidatosMesclagem | null>(null);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeCandidateId, setMergeCandidateId] = useState("");
  const [mergeConfirmed, setMergeConfirmed] = useState(false);
  const [loadingMergeCandidates, setLoadingMergeCandidates] = useState(false);
  const [mergingProducts, setMergingProducts] = useState(false);
  const [mergeError, setMergeError] = useState("");

  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const [reclassifying, setReclassifying] = useState(false);

  const filtersActive = Boolean(
    appliedSearch || appliedCategory || appliedOnlyReview,
  );

  const selectedCategoryName = useMemo(
    () => categories.find((category) => category.id === appliedCategory)?.nome,
    [appliedCategory, categories],
  );

  const selectedMergeCandidate = useMemo<ProdutoMesclagemResumo | null>(
    () =>
      mergeData?.candidatos.find(
        (candidate) => candidate.id === mergeCandidateId,
      ) ?? null,
    [mergeCandidateId, mergeData],
  );

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetchProducts(
        apiUrl,
        accessToken,
        0,
        PAGE_SIZE,
        appliedSearch,
        appliedOnlyReview,
        appliedCategory,
        controller.signal,
      ),
      fetchCategories(apiUrl, accessToken, controller.signal),
    ])
      .then(([productResult, categoryResult]) => {
        setProducts(productResult.produtos);
        setCategories(categoryResult);
        setTotal(productResult.total);
        setReviewCount(productResult.para_revisar);
        setClassifiedCount(productResult.classificados);
        setFilteredCount(productResult.filtrados);
        setHasMore(productResult.tem_mais);
        setNextOffset(productResult.proximo_offset);
        setState("ready");
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os produtos.",
        );
        setState("error");
      });

    return () => controller.abort();
  }, [
    accessToken,
    apiUrl,
    appliedCategory,
    appliedOnlyReview,
    appliedSearch,
    reloadKey,
  ]);

  const reload = () => {
    setState("loading");
    setError("");
    setReloadKey((value) => value + 1);
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSearch = searchDraft.trim();

    setMessage("");
    setState("loading");
    setError("");
    setAppliedSearch(normalizedSearch);
    setAppliedCategory(categoryDraft);
    setAppliedOnlyReview(onlyReviewDraft);

    if (
      normalizedSearch === appliedSearch &&
      categoryDraft === appliedCategory &&
      onlyReviewDraft === appliedOnlyReview
    ) {
      reload();
    }
  };

  const clearFilters = () => {
    setSearchDraft("");
    setCategoryDraft("");
    setOnlyReviewDraft(false);
    setAppliedSearch("");
    setAppliedCategory("");
    setAppliedOnlyReview(false);
    setMessage("");
    setState("loading");

    if (!filtersActive) reload();
  };

  const loadMore = async () => {
    if (loadingMore || nextOffset === null) return;

    setLoadingMore(true);
    setError("");

    try {
      const result = await fetchProducts(
        apiUrl,
        accessToken,
        nextOffset,
        PAGE_SIZE,
        appliedSearch,
        appliedOnlyReview,
        appliedCategory,
      );

      setProducts((current) => {
        const known = new Set(current.map((product) => product.id));
        return [
          ...current,
          ...result.produtos.filter((product) => !known.has(product.id)),
        ];
      });
      setHasMore(result.tem_mais);
      setNextOffset(result.proximo_offset);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar mais produtos.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const startEditing = (product: ProdutoResumo) => {
    setEditingId(product.id);
    setEditName(product.nome);
    setEditBrand(product.marca);
    setEditUnit(product.unidade_padrao || "un");
    setEditCategory(product.categoria_id || categories[0]?.id || "");
    setEditError("");
  };

  const loadMergeCandidates = async (productId: string, search = "") => {
    setLoadingMergeCandidates(true);
    setMergeError("");

    try {
      const result = await fetchMergeCandidates(
        apiUrl,
        accessToken,
        productId,
        search,
      );
      setMergeData(result);
      setMergeCandidateId((current) =>
        result.candidatos.some((candidate) => candidate.id === current)
          ? current
          : "",
      );
    } catch (loadError) {
      setMergeData(null);
      setMergeError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os produtos para mesclagem.",
      );
    } finally {
      setLoadingMergeCandidates(false);
    }
  };

  const startMerging = (product: ProdutoResumo) => {
    setEditingId(null);
    setEditError("");
    setMergeProductId(product.id);
    setMergeData(null);
    setMergeSearch("");
    setMergeCandidateId("");
    setMergeConfirmed(false);
    setMergeError("");
    void loadMergeCandidates(product.id);
  };

  const cancelMerging = () => {
    setMergeProductId(null);
    setMergeData(null);
    setMergeSearch("");
    setMergeCandidateId("");
    setMergeConfirmed(false);
    setMergeError("");
  };

  const searchMergeCandidates = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mergeProductId || loadingMergeCandidates) return;
    setMergeCandidateId("");
    setMergeConfirmed(false);
    void loadMergeCandidates(mergeProductId, mergeSearch.trim());
  };

  const submitMerge = async () => {
    if (
      !mergeProductId ||
      !mergeCandidateId ||
      !mergeConfirmed ||
      mergingProducts
    ) {
      return;
    }

    setMergingProducts(true);
    setMergeError("");

    try {
      const result = await mergeProducts(
        apiUrl,
        accessToken,
        mergeProductId,
        mergeCandidateId,
      );
      cancelMerging();
      setMessage(
        `${result.mensagem} ${result.itens_transferidos} itens e ${result.historicos_transferidos} registros de preço foram reunidos em ${result.produto_principal_nome}.`,
      );
      reload();
    } catch (mergeFailure) {
      setMergeError(
        mergeFailure instanceof Error
          ? mergeFailure.message
          : "Não foi possível mesclar os produtos.",
      );
    } finally {
      setMergingProducts(false);
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId || savingProduct) return;

    setSavingProduct(true);
    setEditError("");

    try {
      const result = await updateProduct(apiUrl, accessToken, editingId, {
        nome: editName.trim(),
        marca: editBrand.trim(),
        unidade_padrao: editUnit.trim().toLowerCase(),
        categoria_id: editCategory,
      });

      setEditingId(null);
      setMessage(result.mensagem);
      reload();
    } catch (saveError) {
      setEditError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível atualizar o produto.",
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creatingCategory || newCategoryName.trim().length < 2) return;

    setCreatingCategory(true);
    setCategoryError("");

    try {
      const result = await createCategory(
        apiUrl,
        accessToken,
        newCategoryName.trim(),
      );
      const refreshedCategories = await fetchCategories(apiUrl, accessToken);
      setCategories(refreshedCategories);
      setNewCategoryName("");
      setCategoryExpanded(false);
      setMessage(result.mensagem);
      if (editingId) setEditCategory(result.id);
    } catch (createError) {
      setCategoryError(
        createError instanceof Error
          ? createError.message
          : "Não foi possível criar a categoria.",
      );
    } finally {
      setCreatingCategory(false);
    }
  };

  const runReclassification = async () => {
    if (reclassifying) return;

    setReclassifying(true);
    setError("");
    setMessage("");

    try {
      const result = await reclassifyProducts(apiUrl, accessToken);
      setMessage(
        `${result.mensagem} ${result.classificados} classificados automaticamente; ${result.pendentes} continuam para revisão.`,
      );
      reload();
    } catch (reclassifyError) {
      setError(
        reclassifyError instanceof Error
          ? reclassifyError.message
          : "Não foi possível reclassificar os produtos.",
      );
    } finally {
      setReclassifying(false);
    }
  };

  return (
    <section className="products-section" aria-label="Produtos da família">
      <div className="products-heading">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h2>Produtos da família</h2>
          <span>Revise nomes, marcas, unidades e categorias em cards mobile.</span>
        </div>
        <button type="button" onClick={reload} disabled={state === "loading"}>
          Atualizar
        </button>
      </div>

      <div className="product-kpi-grid" aria-label="Resumo dos produtos">
        <article>
          <span>Total</span>
          <strong>{total}</strong>
        </article>
        <article className={reviewCount > 0 ? "attention" : ""}>
          <span>Para revisar</span>
          <strong>{reviewCount}</strong>
        </article>
        <article>
          <span>Classificados</span>
          <strong>{classifiedCount}</strong>
        </article>
      </div>

      <section className="product-tools-card">
        <div>
          <strong>Classificação automática</strong>
          <span>
            Aplica regras somente aos produtos ainda não classificados. Categorias revisadas são preservadas.
          </span>
        </div>
        <button
          className="secondary-action-button"
          type="button"
          disabled={reclassifying || reviewCount === 0}
          onClick={() => void runReclassification()}
        >
          {reclassifying ? "Reclassificando…" : "Reclassificar pendentes"}
        </button>
      </section>

      <form className="product-filters-card" onSubmit={applyFilters}>
        <label>
          Buscar produto ou marca
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            maxLength={100}
            placeholder="Ex.: arroz ou marca"
          />
        </label>

        <label>
          Categoria
          <select
            value={categoryDraft}
            onChange={(event) => setCategoryDraft(event.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.nome} ({category.produtos_count})
              </option>
            ))}
          </select>
        </label>

        <label className="review-checkbox-row">
          <input
            type="checkbox"
            checked={onlyReviewDraft}
            onChange={(event) => setOnlyReviewDraft(event.target.checked)}
          />
          Mostrar somente produtos para revisar
        </label>

        <div className="product-filter-actions">
          <button className="ghost-action" type="button" onClick={clearFilters}>
            Limpar
          </button>
          <button className="capture-button" type="submit">
            Filtrar
          </button>
        </div>

        {filtersActive && (
          <div className="active-filter-summary" aria-live="polite">
            <span>Filtros ativos</span>
            {appliedSearch && <strong>Busca: {appliedSearch}</strong>}
            {selectedCategoryName && <strong>Categoria: {selectedCategoryName}</strong>}
            {appliedOnlyReview && <strong>Somente para revisar</strong>}
          </div>
        )}
      </form>

      <section className="category-create-card">
        {!categoryExpanded ? (
          <button type="button" onClick={() => setCategoryExpanded(true)}>
            <span aria-hidden="true">＋</span>
            Adicionar categoria personalizada
          </button>
        ) : (
          <form onSubmit={submitCategory}>
            <label>
              Nome da nova categoria
              <input
                type="text"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                minLength={2}
                maxLength={80}
                placeholder="Ex.: Congelados"
                required
              />
            </label>
            {categoryError && <p className="inline-error">{categoryError}</p>}
            <div className="product-filter-actions">
              <button
                className="ghost-action"
                type="button"
                disabled={creatingCategory}
                onClick={() => {
                  setCategoryExpanded(false);
                  setNewCategoryName("");
                  setCategoryError("");
                }}
              >
                Cancelar
              </button>
              <button
                className="capture-button"
                type="submit"
                disabled={creatingCategory}
              >
                {creatingCategory ? "Salvando…" : "Criar categoria"}
              </button>
            </div>
          </form>
        )}
      </section>

      {message && (
        <section className="feedback-card success-card products-success" role="status">
          <strong>Catálogo atualizado</strong>
          <p>{message}</p>
        </section>
      )}

      {state === "loading" && (
        <section className="processing-card" role="status">
          <span className="spinner" aria-hidden="true" />
          <div>
            <strong>Carregando produtos</strong>
            <p>Buscando o catálogo da sua família…</p>
          </div>
        </section>
      )}

      {state === "error" && (
        <section className="feedback-card error-card" role="alert">
          <strong>Não foi possível carregar os produtos</strong>
          <p>{error}</p>
          <button className="capture-button" type="button" onClick={reload}>
            Tentar novamente
          </button>
        </section>
      )}

      {state === "ready" && products.length === 0 && (
        <section className="products-empty-card">
          <div aria-hidden="true">📦</div>
          <strong>{filtersActive ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}</strong>
          <p>
            {filtersActive
              ? "Altere ou limpe os filtros para localizar outros produtos."
              : "Os produtos aparecem automaticamente quando uma NFC-e é salva."}
          </p>
          {filtersActive ? (
            <button className="capture-button" type="button" onClick={clearFilters}>
              Limpar filtros
            </button>
          ) : (
            <button className="capture-button" type="button" onClick={onAddPurchase}>
              Adicionar compra
            </button>
          )}
        </section>
      )}

      {state === "ready" && products.length > 0 && (
        <>
          <div className="products-result-summary">
            <span>{filteredCount === 1 ? "1 produto encontrado" : `${filteredCount} produtos encontrados`}</span>
            {reviewCount > 0 && <strong>{reviewCount} aguardando revisão</strong>}
          </div>

          <div className="product-list">
            {products.map((product) => (
              <article
                className={`product-card ${product.revisar ? "needs-review" : ""}`}
                key={product.id}
              >
                {editingId !== product.id && mergeProductId !== product.id ? (
                  <>
                    <div className="product-card-heading">
                      <div>
                        <span className="product-category-badge">
                          {product.categoria_nome}
                        </span>
                        <h3>{product.nome}</h3>
                        {product.marca && <small>Marca: {product.marca}</small>}
                      </div>
                      {product.revisar && <b>Revisar</b>}
                    </div>

                    <div className="product-metrics">
                      <span>
                        <small>Unidade</small>
                        {product.unidade_padrao}
                      </span>
                      <span>
                        <small>Último valor</small>
                        {product.ultimo_valor_unitario === null
                          ? "—"
                          : moneyFormatter.format(product.ultimo_valor_unitario)}
                      </span>
                      <span>
                        <small>Última compra</small>
                        {formatDate(product.ultima_compra)}
                      </span>
                      <span>
                        <small>Compras</small>
                        {product.compras_count}
                      </span>
                    </div>

                    <div className="product-card-actions">
                      <button
                        className="product-edit-button"
                        type="button"
                        onClick={() => startEditing(product)}
                      >
                        {product.revisar ? "Revisar produto" : "Editar produto"}
                      </button>
                      {canMergeProducts && (
                        <button
                          className="product-merge-button"
                          type="button"
                          onClick={() => startMerging(product)}
                        >
                          Mesclar com outro produto
                        </button>
                      )}
                    </div>
                  </>
                ) : editingId === product.id ? (
                  <form className="product-edit-form" onSubmit={saveProduct}>
                    <div>
                      <strong>Editar produto</strong>
                      <span>Salve para confirmar a categoria e retirar da revisão.</span>
                    </div>
                    <label>
                      Nome padronizado
                      <input
                        type="text"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        minLength={1}
                        maxLength={240}
                        required
                      />
                    </label>
                    <label>
                      Marca
                      <input
                        type="text"
                        value={editBrand}
                        onChange={(event) => setEditBrand(event.target.value)}
                        maxLength={100}
                        placeholder="Opcional"
                      />
                    </label>
                    <div className="product-edit-grid">
                      <label>
                        Unidade
                        <input
                          type="text"
                          value={editUnit}
                          onChange={(event) => setEditUnit(event.target.value)}
                          minLength={1}
                          maxLength={20}
                          required
                        />
                      </label>
                      <label>
                        Categoria
                        <select
                          value={editCategory}
                          onChange={(event) => setEditCategory(event.target.value)}
                          required
                        >
                          <option value="" disabled>Selecione</option>
                          {categories.map((category) => (
                            <option value={category.id} key={category.id}>
                              {category.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {editError && <p className="inline-error">{editError}</p>}
                    {editError.toLocaleLowerCase("pt-BR").includes("já existe") &&
                      canMergeProducts && (
                        <p className="product-merge-hint">
                          O cadastro já existe. Cancele a edição e use a opção de mesclagem no produto que deseja manter.
                        </p>
                      )}
                    <div className="product-filter-actions">
                      <button
                        className="ghost-action"
                        type="button"
                        disabled={savingProduct}
                        onClick={() => {
                          setEditingId(null);
                          setEditError("");
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        className="capture-button"
                        type="submit"
                        disabled={savingProduct || !editCategory}
                      >
                        {savingProduct ? "Salvando…" : "Salvar produto"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <section className="product-merge-form" aria-label="Mesclar produtos">
                    <div className="product-merge-heading">
                      <strong>Mesclar produtos</strong>
                      <span>
                        <b>{product.nome}</b> será mantido. Escolha o cadastro duplicado que será incorporado.
                      </span>
                    </div>

                    <div className="merge-main-product">
                      <span>Produto principal</span>
                      <strong>{mergeData?.produto_principal.nome ?? product.nome}</strong>
                      <small>
                        Unidade {mergeData?.produto_principal.unidade_padrao ?? product.unidade_padrao}
                        {mergeData && ` · ${mergeData.produto_principal.compras_count} compras · ${mergeData.produto_principal.registros_precos_count} registros de preço`}
                      </small>
                    </div>

                    <form className="merge-search-row" onSubmit={searchMergeCandidates}>
                      <label>
                        Buscar produto duplicado
                        <input
                          type="search"
                          value={mergeSearch}
                          onChange={(event) => setMergeSearch(event.target.value)}
                          maxLength={100}
                          placeholder="Digite parte do nome ou da marca"
                        />
                      </label>
                      <button
                        className="secondary-action-button"
                        type="submit"
                        disabled={loadingMergeCandidates}
                      >
                        {loadingMergeCandidates ? "Buscando…" : "Buscar"}
                      </button>
                    </form>

                    {loadingMergeCandidates && (
                      <div className="merge-loading" role="status">
                        <span className="spinner" aria-hidden="true" />
                        Carregando produtos compatíveis…
                      </div>
                    )}

                    {!loadingMergeCandidates && mergeData && (
                      <label className="merge-candidate-select">
                        Produto que será incorporado
                        <select
                          value={mergeCandidateId}
                          onChange={(event) => {
                            setMergeCandidateId(event.target.value);
                            setMergeConfirmed(false);
                            setMergeError("");
                          }}
                        >
                          <option value="">Selecione um produto</option>
                          {mergeData.candidatos.map((candidate) => (
                            <option value={candidate.id} key={candidate.id}>
                              {candidate.nome} · {candidate.compras_count} compras · {candidate.registros_precos_count} registros
                            </option>
                          ))}
                        </select>
                        <small>
                          Somente produtos ativos com unidade {mergeData.produto_principal.unidade_padrao} são exibidos.
                        </small>
                      </label>
                    )}

                    {!loadingMergeCandidates &&
                      mergeData &&
                      mergeData.candidatos.length === 0 && (
                        <p className="merge-empty">
                          Nenhum produto compatível foi encontrado. Altere a busca ou confirme se as unidades são iguais.
                        </p>
                      )}

                    {selectedMergeCandidate && mergeData && (
                      <div className="merge-preview">
                        <article>
                          <span>Será mantido</span>
                          <strong>{mergeData.produto_principal.nome}</strong>
                          <small>{mergeData.produto_principal.categoria_nome}</small>
                          <p>
                            {mergeData.produto_principal.compras_count} compras · {mergeData.produto_principal.registros_precos_count} preços · {quantityFormatter.format(mergeData.produto_principal.quantidade_total)} {mergeData.produto_principal.unidade_padrao}
                          </p>
                        </article>
                        <span className="merge-arrow" aria-hidden="true">↓</span>
                        <article className="incorporated">
                          <span>Será incorporado</span>
                          <strong>{selectedMergeCandidate.nome}</strong>
                          <small>{selectedMergeCandidate.categoria_nome}</small>
                          <p>
                            {selectedMergeCandidate.compras_count} compras · {selectedMergeCandidate.registros_precos_count} preços · {quantityFormatter.format(selectedMergeCandidate.quantidade_total)} {selectedMergeCandidate.unidade_padrao}
                          </p>
                        </article>
                      </div>
                    )}

                    {selectedMergeCandidate && (
                      <label className="merge-confirm-row">
                        <input
                          type="checkbox"
                          checked={mergeConfirmed}
                          onChange={(event) => setMergeConfirmed(event.target.checked)}
                        />
                        <span>
                          Confirmo que <b>{selectedMergeCandidate.nome}</b> é o mesmo produto e deve ser incorporado a <b>{product.nome}</b>.
                        </span>
                      </label>
                    )}

                    <p className="merge-warning">
                      Compras e históricos serão reunidos. As descrições antigas virarão aliases para que o produto duplicado não seja recriado nas próximas notas.
                    </p>

                    {mergeError && <p className="inline-error">{mergeError}</p>}

                    <div className="product-filter-actions">
                      <button
                        className="ghost-action"
                        type="button"
                        disabled={mergingProducts}
                        onClick={cancelMerging}
                      >
                        Cancelar
                      </button>
                      <button
                        className="capture-button"
                        type="button"
                        disabled={
                          mergingProducts ||
                          !selectedMergeCandidate ||
                          !mergeConfirmed
                        }
                        onClick={() => void submitMerge()}
                      >
                        {mergingProducts ? "Mesclando…" : "Confirmar mesclagem"}
                      </button>
                    </div>
                  </section>
                )}
              </article>
            ))}
          </div>

          {error && <p className="purchases-inline-error">{error}</p>}

          {hasMore && (
            <button
              className="load-more-button"
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Carregando…" : "Carregar mais produtos"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
