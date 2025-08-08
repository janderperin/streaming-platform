// page.tsx
interface PageProps {
  params: { id: string }
}

export default function Page({ params }: PageProps) {
  return (
    <div className="p-4">
      <h1>Estúdio ID: {params.id}</h1>
    </div>
  )
}
