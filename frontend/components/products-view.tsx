"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createCategory,
  fetchCategories,
  fetchProducts,
  reclassifyProducts,
  updateProduct,
} from "@/services/produtos";
import type {
  CategoriaResumo,
  ProdutoResumo,
} from "@/types/produtos";

type Props = {
  apiUrl: string;
  accessToken: string;
  onAddPurchase: () => void;
};

type LoadState = "loading" | "ready" | "error";

const PAGE_SIZE = 20;

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDate(value: string | null): string {
  if (!value) return "Sem histórico";

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(year, month - 1, day),
  );
}

export function ProductsView({ apiUrl, accessToken, onAddPurchase }: Props) {
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
                {editingId !== product.id ? (
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

                    <button
                      className="product-edit-button"
                      type="button"
                      onClick={() => startEditing(product)}
                    >
                      {product.revisar ? "Revisar produto" : "Editar produto"}
                    </button>
                  </>
                ) : (
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
