import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { router } from './router';
import { AuthBootstrap } from './components/auth-bootstrap';
import { Toaster } from './components/ui/toaster';
import { pushToast } from './lib/toast';
import { getApiError } from './lib/api';

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (typeof mutation.options.onError === 'function') return;
      pushToast(getApiError(error));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
