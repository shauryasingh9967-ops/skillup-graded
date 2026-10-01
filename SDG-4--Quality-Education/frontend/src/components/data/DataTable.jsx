import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { TableSkeleton, EmptyState, ErrorState } from '../ui/Feedback';

/*
 * columns: [{ key, header, render?(row), align?, sortKey?, width? }]
 * sort: { key, order }  onSort(sortKey)
 */
export default function DataTable({ columns, rows, rowKey = '_id', loading, error, onRetry, empty, sort, onSort, compact, caption }) {
  if (error && !rows?.length) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading && !rows?.length) return <TableSkeleton cols={Math.min(columns.length, 6)} />;
  if (!loading && rows && rows.length === 0) return empty || <EmptyState title="No results" />;

  return (
    <div className="table-wrap" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }} aria-busy={loading || undefined}>
      <table className={`table ${compact ? 'compact' : ''}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => {
              const sortable = c.sortKey && onSort;
              const active = sortable && sort?.key === c.sortKey;
              return (
                <th key={c.key} scope="col" className={c.align || ''} style={c.width ? { width: c.width } : undefined} aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {sortable ? (
                    <button type="button" className="th-sort" onClick={() => onSort(c.sortKey)}>
                      {c.header}
                      {active ? (sort.order === 'asc' ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />) : <ChevronsUpDown size={13} aria-hidden="true" style={{ opacity: 0.5 }} />}
                    </button>
                  ) : c.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row[rowKey] ?? i}>
              {columns.map((c) => <td key={c.key} className={c.align || ''}>{c.render ? c.render(row, i) : row[c.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
