import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export function useItems<T = any>(collection: string) {
    const queryClient = useQueryClient();

    // Fetch items
    const { data: items = [], isLoading, error } = useQuery<T[]>({
        queryKey: [collection],
        queryFn: async () => {
            const response = await api.get(`/${collection}`);
            return response.data;
        }
    });

    // Create item
    const createMutation = useMutation({
        mutationFn: async (newItem: any) => {
            const response = await api.post(`/${collection}`, newItem);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [collection] });
            toast.success("Item created successfully");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to create item");
        }
    });

    // Update item
    const updateMutation = useMutation({
        mutationFn: async (arg: { id: string; data?: any } & Record<string, any>) => {
            const { id, data, ...rest } = arg;
            const payload = data !== undefined ? data : rest;
            const response = await api.patch(`/${collection}/${id}`, payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [collection] });
            toast.success("Item updated successfully");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to update item");
        }
    });

    // Delete item
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/${collection}/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [collection] });
            queryClient.invalidateQueries({ queryKey: [`${collection}-trash`] });   // deleted items land in the trash
            toast.success("Item deleted/archived successfully");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete item");
        }
    });

    return {
        items,
        isLoading,
        error,
        createItem: createMutation.mutate,
        isCreating: createMutation.isPending,
        updateItem: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
        deleteItem: deleteMutation.mutate,
        isDeleting: deleteMutation.isPending
    };
}
