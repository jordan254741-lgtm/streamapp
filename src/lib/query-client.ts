import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 10000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})
