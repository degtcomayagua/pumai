import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/config')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/config"!</div>
}
