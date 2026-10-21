import { Route } from 'react-router-dom';
import { TQ_BASE } from '@/apps/tq-enhancement/constants';
import { TqEnhancementApp } from '@/apps/tq-enhancement/TqEnhancementApp';

export const tqEnhancementRoutes = <Route path={`${TQ_BASE}/*`} element={<TqEnhancementApp />} />;
