import dynamic from 'next/dynamic'

const OpravaForm = dynamic(() => import('@/components/OpravaForm'), {
  ssr: false,
  loading: () => <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Načítavam...</div>,
})

export default function OpravaPage() {
  return <OpravaForm />
}
