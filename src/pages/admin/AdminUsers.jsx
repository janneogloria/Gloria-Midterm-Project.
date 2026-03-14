/**
 * AdminUsers.jsx
 * View, search, update college, and block/unblock visitors.
 * Single search bar: searches by name, email, or college.
 * Filter by date.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToUsers, setUserBlocked, updateUserProfile } from '../../firebase/firestore';
import { COLLEGES, formatDate, getInitials, getAvatarColor } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Search, Users, Ban, CheckCircle, Edit2, X, Save } from 'lucide-react';
import './AdminUsers.css';

/* ── Inline edit modal ─────────────────────────────────────── */
function EditModal({ user, onClose, onSave }) {
  const [college, setCollege] = useState(user.college || '');
  const [saving,  setSaving]  = useState(false);
  const handle = async () => {
    setSaving(true);
    await onSave(user.id, { college });
    onClose();
  };
  return (
    <div className="au-modal-overlay anim-fade-in" onClick={onClose}>
      <div className="au-modal card anim-scale-in" onClick={e => e.stopPropagation()}>
        <div className="au-modal__head">
          <h3>Edit User</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="au-modal__body">
          <div className="au-modal__info">
            <div className="au-modal__av" style={{ background: getAvatarColor(user.name) }}>
              {user.photoURL
                ? <img src={user.photoURL} alt={user.name} referrerPolicy="no-referrer" />
                : getInitials(user.name)
              }
            </div>
            <div>
              <div className="au-modal__name">{user.name}</div>
              <div className="au-modal__email">{user.email}</div>
            </div>
          </div>
          <label className="au-modal__label">College / Department</label>
          <select className="au-modal__select" value={college} onChange={e => setCollege(e.target.value)}>
            <option value="">Select…</option>
            {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="au-modal__foot">
          <button className="au-modal__btn au-modal__btn--cancel" onClick={onClose}>Cancel</button>
          <button className="au-modal__btn au-modal__btn--save" onClick={handle} disabled={saving}>
            {saving ? 'Saving…' : <><Save size={13} />Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function AdminUsers() {
  const [users,    setUsers]    = useState([]);
  const [query,    setQuery]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(null);
  const [blocking, setBlocking] = useState(null);

  useEffect(() => {
    const unsub = subscribeToUsers(data => { setUsers(data); setLoading(false); });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.college?.toLowerCase().includes(q)
    );
  }, [users, query]);

  const toggleBlock = async (u) => {
    setBlocking(u.id);
    try {
      await setUserBlocked(u.id, !u.blocked);
      toast.success(u.blocked ? `${u.name} unblocked.` : `${u.name} has been blocked.`);
    } catch { toast.error('Action failed.'); }
    finally { setBlocking(null); }
  };

  const handleSave = async (uid, data) => {
    await updateUserProfile(uid, data);
    toast.success('Profile updated.');
  };

  return (
    <div className="au">
      <div className="au__head anim-fade-up">
        <div>
          <h1><Users size={20} />User Management</h1>
          <p>View, edit, and manage visitor accounts.</p>
        </div>
        <span className="badge badge--navy">{users.length} total users</span>
      </div>

      {/* Search bar */}
      <div className="au__search-wrap anim-fade-up delay-1">
        <div className="au__search">
          <Search size={15} className="au__search-icon" />
          <input
            type="text"
            className="au__search-input"
            placeholder="Search by name, email, or college…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="au__search-clear" onClick={() => setQuery('')}><X size={13} /></button>
          )}
        </div>
        {query && (
          <span className="au__results-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <div className="au__loading">Loading users…</div>
      ) : filtered.length === 0 ? (
        <div className="au__empty card">
          <Users size={32} color="var(--text-3)" />
          <p>{query ? 'No users found.' : 'No users registered yet.'}</p>
        </div>
      ) : (
        <div className="au__table-wrap card anim-fade-up delay-2">
          <table className="au__table">
            <thead>
              <tr>
                <th>User</th>
                <th>College</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className={`anim-fade-up delay-${Math.min(i+1,6)}`}>
                  <td>
                    <div className="au__user-cell">
                      <div className="au__av" style={{ background: getAvatarColor(u.name) }}>
                        {u.photoURL
                          ? <img src={u.photoURL} alt={u.name} referrerPolicy="no-referrer" />
                          : getInitials(u.name)
                        }
                      </div>
                      <div>
                        <div className="au__user-name">{u.name}</div>
                        <div className="au__user-email">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="au__college">{u.college || '—'}</span></td>
                  <td><span className="au__date">{formatDate(u.createdAt)}</span></td>
                  <td>
                    <span className={`badge ${u.blocked ? 'badge--red' : 'badge--green'}`}>
                      {u.blocked ? '⛔ Blocked' : '✓ Active'}
                    </span>
                  </td>
                  <td>
                    <div className="au__actions">
                      <button
                        className="au__action-btn au__action-btn--edit"
                        onClick={() => setEditing(u)}
                        title="Edit"
                      ><Edit2 size={13} /></button>
                      <button
                        className={`au__action-btn ${u.blocked ? 'au__action-btn--unblock' : 'au__action-btn--block'}`}
                        onClick={() => toggleBlock(u)}
                        disabled={blocking === u.id}
                        title={u.blocked ? 'Unblock' : 'Block'}
                      >
                        {blocking === u.id
                          ? <span className="au__mini-spinner" />
                          : u.blocked ? <CheckCircle size={13} /> : <Ban size={13} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}