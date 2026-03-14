import RoleRoute from './RoleRoute';
export default function ProtectedRoute({ children }) {
  return <RoleRoute requiredRole="admin">{children}</RoleRoute>;
}