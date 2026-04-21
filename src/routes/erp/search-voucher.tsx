import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/erp/search-voucher')({
  component: SearchVoucherPage,
})

type Invoice = {
  invoice_id: number
  vendor_id?: number
  amount?: number
  status?: string
}

function SearchVoucherPage() {
  const [invoiceId, setInvoiceId] = useState('')
  const [results, setResults] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResults([])

    try {
      const res = await fetch(
        `/api/search-voucher?invoice_id=${encodeURIComponent(invoiceId)}`
      )

      const text = await res.text()
      let data: any = {}

      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`API returned non-JSON: ${text.slice(0, 120)}`)
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Search failed')
      }

      setResults(data.invoices || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1>Search Voucher</h1>

      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <input
          type="number"
          placeholder="Enter invoice ID"
          value={invoiceId}
          onChange={(e) => setInvoiceId(e.target.value)}
          style={{ padding: '8px', marginRight: '8px', width: '250px' }}
        />

        <button type="submit" disabled={loading || !invoiceId}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && results.length === 0 && invoiceId && !error && (
        <p>No invoice found for that invoice ID.</p>
      )}

      {results.length > 0 && (
        <table
          border={1}
          cellPadding={8}
          style={{ borderCollapse: 'collapse', width: '100%' }}
        >
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Vendor ID</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((invoice) => (
              <tr key={invoice.invoice_id}>
                <td>{invoice.invoice_id}</td>
                <td>{invoice.vendor_id ?? ''}</td>
                <td>{invoice.amount ?? ''}</td>
                <td>{invoice.status ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
