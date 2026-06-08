import React, { useMemo } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { AvatarBadge } from '../AvatarBadge.jsx';
import { hasCustomAvatar } from '../defaultAvatar.js';
import { safeDate } from '../lib/format.js';
import { EmptyState, ModePill } from './ui.jsx';
import { QuestionCounters, QuizPreview } from './QuizPreview.jsx';

export function DataPage({
  crudBusy,
  globalFilter,
  onDelete,
  onEdit,
  page,
  rows,
  usersById = {},
  selectedRecord,
  setGlobalFilter,
  setSelectedRecord,
}) {
  const columns = useMemo(
    () =>
      getColumns(page, {
        crudBusy,
        onDelete,
        onEdit,
        onSelect: setSelectedRecord,
        usersById,
      }),
    [crudBusy, onDelete, onEdit, page, setSelectedRecord, usersById],
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) =>
      JSON.stringify(row.original)
        .toLowerCase()
        .includes(String(filterValue).toLowerCase()),
  });

  return (
    <div
      className={selectedRecord ? 'data-layout with-details' : 'data-layout'}
    >
      <div>
        <div className="toolbar glass-panel">
          <Search size={18} />
          <input
            value={globalFilter ?? ''}
            onChange={event => setGlobalFilter(event.target.value)}
            placeholder="Rechercher dans les donnees chargees..."
          />
          <span>
            {table.getFilteredRowModel().rows.length}/{rows.length} lignes
          </span>
        </div>
        <div className="table-card glass-panel">
          <table>
            <thead>
              {table.getHeaderGroups().map(group => (
                <tr key={group.id}>
                  {group.headers.map(header => (
                    <th key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState label="Aucune donnee." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedRecord && (
        <DetailsPanel
          crudBusy={crudBusy}
          onClose={() => setSelectedRecord(null)}
          onDelete={onDelete}
          onEdit={onEdit}
          page={page}
          record={selectedRecord}
          usersById={usersById}
        />
      )}
    </div>
  );
}

function getColumns(page, { crudBusy, onDelete, onEdit, onSelect, usersById = {} }) {
  const action = info => {
    const record = info?.row?.original;
    if (!record) return null;
    return (
      <div className="row-actions">
        <button className="btn small" onClick={() => onSelect(record)}>
          Voir
        </button>
        <button
          className="btn small ghost"
          disabled={crudBusy}
          onClick={() => onEdit(record)}
          title="Modifier"
        >
          <Pencil size={14} />
        </button>
        <button
          className="btn small danger"
          disabled={crudBusy}
          onClick={() => onDelete(record)}
          title="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };
  if (page === 'questions')
    return [
      {
        header: 'Theme',
        cell: info => <strong>{info.row.original.theme || 'N/A'}</strong>,
      },
      {
        header: 'Questions / reponses',
        cell: info => <QuizPreview questions={info.row.original.questions} />,
      },
      {
        header: 'Types',
        cell: info => (
          <QuestionCounters questions={info.row.original.questions} />
        ),
      },
      { header: 'Date', cell: info => safeDate(info.row.original.createdAt) },
      { header: 'Actions', cell: action },
    ];
  if (page === 'users')
    return [
      {
        header: 'Joueur',
        cell: info => {
          const record = info.row.original;
          const name =
            record.displayName || record.username || 'Player';
          return (
            <div className="avatar-cell">
              <AvatarBadge
                avatarUrl={record.avatarUrl}
                seed={record.id}
                displayName={name}
                size={40}
              />
              <div className="avatar-cell-meta">
                <strong>{name}</strong>
                <span className="avatar-cell-sub">{record.email || '—'}</span>
              </div>
            </div>
          );
        },
      },
      { header: 'Total', cell: info => info.row.original.totalScore || 0 },
      { header: 'Best', cell: info => info.row.original.bestScore || 0 },
      { header: 'Played', cell: info => info.row.original.gamesPlayed || 0 },
      { header: 'Coupes', cell: info => info.row.original.cups || 0 },
      {
        header: 'Photo',
        cell: info => {
          const record = info.row.original;
          const custom = hasCustomAvatar(record.avatarUrl);
          return (
            <span className={`pill ${custom ? 'mcq' : 'open'}`}>
              {custom ? 'Personnalisee' : 'Par defaut'}
            </span>
          );
        },
      },
      { header: 'Actions', cell: action },
    ];
  if (page === 'scores')
    return [
      {
        header: 'Joueur',
        cell: info => {
          const record = info.row.original;
          const user = usersById[record.userId];
          const name = record.displayName || user?.displayName || 'Player';
          return (
            <div className="avatar-cell">
              <AvatarBadge
                avatarUrl={record.avatarUrl || user?.avatarUrl}
                seed={record.userId || record.id}
                displayName={name}
                size={36}
              />
              <strong>{name}</strong>
            </div>
          );
        },
      },
      { header: 'Theme', accessorKey: 'theme' },
      {
        header: 'Score',
        cell: info => <strong>{info.row.original.score || 0}</strong>,
      },
      {
        header: 'Mode',
        cell: info => <ModePill mode={info.row.original.mode} />,
      },
      { header: 'Date', cell: info => safeDate(info.row.original.createdAt) },
      { header: 'Actions', cell: action },
    ];
  return [
    {
      header: 'Code',
      cell: info => (
        <strong>{info.row.original.code || info.row.original.id}</strong>
      ),
    },
    { header: 'Theme', cell: info => info.row.original.config?.theme || 'N/A' },
    {
      header: 'Joueurs',
      cell: info => {
        const players = info.row.original.players || [];
        if (!players.length) return '—';
        return (
          <div className="avatar-stack">
            {players.map(player => (
              <AvatarBadge
                key={player.userId || player.displayName}
                avatarUrl={
                  player.avatarUrl || usersById[player.userId]?.avatarUrl
                }
                seed={player.userId}
                displayName={player.displayName || 'Player'}
                size={32}
              />
            ))}
          </div>
        );
      },
    },
    { header: 'Status', cell: info => info.row.original.status || 'waiting' },
    { header: 'Winner', cell: info => info.row.original.winnerId || 'N/A' },
    { header: 'Date', cell: info => safeDate(info.row.original.createdAt) },
    { header: 'Actions', cell: action },
  ];
}

function DetailsPanel({
  crudBusy,
  onClose,
  onDelete,
  onEdit,
  page,
  record,
  usersById = {},
}) {
  const userRecord =
    page === 'users'
      ? record
      : page === 'scores'
      ? usersById[record.userId]
      : null;
  const displayName =
    userRecord?.displayName || record.displayName || 'Player';
  const avatarSeed = userRecord?.id || record.userId || record.id;

  return (
    <aside className="details-panel glass-panel">
      <div className="details-head">
        <h2>Details</h2>
        <button className="btn small ghost" onClick={onClose}>
          Fermer
        </button>
      </div>
      {page === 'users' || page === 'scores' ? (
        <div className="details-avatar-row">
          <AvatarBadge
            avatarUrl={userRecord?.avatarUrl}
            seed={avatarSeed}
            displayName={displayName}
            size={56}
          />
          <div className="details-avatar-meta">
            <strong>{displayName}</strong>
            <span className="avatar-cell-sub">
              {hasCustomAvatar(userRecord?.avatarUrl)
                ? 'Photo personnalisee'
                : 'Avatar par defaut'}
            </span>
          </div>
        </div>
      ) : null}
      <div className="details-actions">
        <button
          className="btn small ghost"
          disabled={crudBusy}
          onClick={() => onEdit(record)}
        >
          <Pencil size={14} /> Modifier
        </button>
        <button
          className="btn small danger"
          disabled={crudBusy}
          onClick={() => onDelete(record)}
        >
          <Trash2 size={14} /> Supprimer
        </button>
      </div>
      <pre>{JSON.stringify(record, null, 2)}</pre>
    </aside>
  );
}
