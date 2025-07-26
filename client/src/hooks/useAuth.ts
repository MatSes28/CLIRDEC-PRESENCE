import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { User } from "@/../../shared/schema";

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/logout");
      return response;
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
      // Force redirect to auth page
      window.location.href = "/";
    },
    onError: () => {
      // Even if logout fails on server, clear local state and redirect
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);
      window.location.href = "/";
    }
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
