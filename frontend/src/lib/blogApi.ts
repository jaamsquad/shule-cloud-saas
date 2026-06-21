import api from "./api";

// Admin (Super Owner) — token auto-attached by the axios interceptor on /owner paths.
export const blogAdmin = {
  stats: () => api.get("/blog/admin/stats").then(r => r.data),
  list: (params?: { q?: string; status?: string; category?: string; tag?: string }) =>
    api.get("/blog/admin/posts", { params }).then(r => r.data),
  get: (id: string) => api.get(`/blog/admin/posts/${id}`).then(r => r.data),
  create: (body: any) => api.post("/blog/admin/posts", body).then(r => r.data),
  update: (id: string, body: any) => api.put(`/blog/admin/posts/${id}`, body).then(r => r.data),
  patch: (id: string, body: any) => api.patch(`/blog/admin/posts/${id}`, body).then(r => r.data),
  remove: (id: string) => api.delete(`/blog/admin/posts/${id}`).then(r => r.data),

  categories: () => api.get("/blog/admin/categories").then(r => r.data),
  createCategory: (body: any) => api.post("/blog/admin/categories", body).then(r => r.data),
  updateCategory: (id: string, body: any) => api.put(`/blog/admin/categories/${id}`, body).then(r => r.data),
  deleteCategory: (id: string) => api.delete(`/blog/admin/categories/${id}`).then(r => r.data),

  tags: () => api.get("/blog/admin/tags").then(r => r.data),
  createTag: (name: string) => api.post("/blog/admin/tags", { name }).then(r => r.data),
  deleteTag: (id: string) => api.delete(`/blog/admin/tags/${id}`).then(r => r.data),

  audit: () => api.get("/blog/admin/audit").then(r => r.data),
};

// Public — no auth.
export const blogPublic = {
  list: (params?: { category?: string; tag?: string; q?: string; page?: number; limit?: number }) =>
    api.get("/blog/public/posts", { params }).then(r => r.data),
  highlights: () => api.get("/blog/public/highlights").then(r => r.data),
  categories: () => api.get("/blog/public/categories").then(r => r.data),
  get: (slug: string) => api.get(`/blog/public/posts/${slug}`).then(r => r.data),
};
