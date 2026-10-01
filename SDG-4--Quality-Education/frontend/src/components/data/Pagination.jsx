import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';

export default function Pagination({ pagination, onPage, noun = 'results' }) {
  if (!pagination || pagination.total === 0) return null;
  const { page, limit, total, pages } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span>Showing <strong className="num">{from}–{to}</strong> of <strong className="num">{total}</strong> {noun}</span>
      <div className="row">
        <Button size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <span className="num" aria-current="page">Page {page} of {pages}</span>
        <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<ChevronRight size={15} aria-hidden="true" /></Button>
      </div>
    </nav>
  );
}
