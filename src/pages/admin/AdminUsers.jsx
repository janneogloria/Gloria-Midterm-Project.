/**
 * AdminUsers.jsx — with college + visitor-type dropdown filters.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { subscribeToUsers, setUserBlocked, updateUserProfile } from '../../firebase/firestore';
import { COLLEGES, formatDate, getInitials, getAvatarColor } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Search, Users, Ban, CheckCircle, Edit2, X, Save, Filter } from 'lucide-react';
import './AdminUsers.css';

const VISITOR_TYPES = ['All', 'Student', 'Faculty / Staff', 'Visitor'];

function EditModal({ user, onClose, onSave }) {
  const [college,  setCollege]  = useState(user.college   || '');
  const [yearLvl,  setYearLvl]  = useState(user.yearLevel || '');
  const [saving,   setSaving]   = useState(false);
  const handle = async () => {
    setSaving(true);
    await onSave(user.id, { college, yearLevel: yearLvl });
    onClose();
  };
  return (
    <div className="au-modal-overlay anim-fade-in" onClick={onClose}>
      <div className="au-modal card anim-scale-in" onClick={e => e.stopPropagation()}>
        <div className="au-modal__head">
          <h3>Edit User</h3>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="au-modal__body">
          <div className="au-modal__info">
            <div className="au-modal__av" style={{background:getAvatarColor(user.name)}}>
              {user.photoURL
                ? <img src={user.photoURL} alt={user.name} referrerPolicy="no-referrer"/>
                : getInitials(user.name)}
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
          <label className="au-modal__label" style={{marginTop:12}}>Year Level / Role</label>
          <select className="au-modal__select" value={yearLvl} onChange={e => setYearLvl(e.target.value)}>
            <option value="">Select…</option>
            {['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate','Faculty / Staff']
              .map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="au-modal__foot">
          <button className="au-modal__btn au-modal__btn--cancel" onClick={onClose}>Cancel</button>
          <button className="au-modal__btn au-modal__btn--save" onClick={handle} disabled={saving}>
            {saving ? 'Saving…' : <><Save size={13}/>Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users,    setUsers]    = useState([]);
  const [query,    setQuery]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(null);
  const [blocking, setBlocking] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCollege, setFilterCollege] = useState('');
  const [filterType,    setFilterType]    = useState('All');

  useEffect(() => {
    const unsub = subscribeToUsers(data => { setUsers(data); setLoading(false); });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return users.filter(u => {
      if (q && !(
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.college?.toLowerCase().includes(q)
      )) return false;
      if (filterCollege && u.college !== filterCollege) return false;
      if (filterType !== 'All') {
        const t = u.visitorType || u.yearLevel === 'Faculty / Staff' ? 'Faculty / Staff' : 'Student';
        if (t !== filterType) return false;
      }
      return true;
    });
  }, [users, query, filterCollege, filterType]);

  const hasFilters = filterCollege || filterType !== 'All';
  const clearFilters = () => { setFilterCollege(''); setFilterType('All'); };

  const toggleBlock = async (u) => {
    setBlocking(u.id);
    try {
      await setUserBlocked(u.id, !u.blocked);
      toast.success(u.blocked ? `${u.name} unblocked.` : `${u.name} blocked.`);
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
          <h1><Users size={20}/>User Management</h1>
          <p>View, edit, and manage visitor accounts.</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button
            className={`au-filter-btn${showFilters?' au-filter-btn--active':''}`}
            onClick={() => setShowFilters(f=>!f)}>
            <Filter size={13}/>
            {hasFilters ? 'Filtered' : 'Filter'}
            {hasFilters && <span className="au-filter-dot"/>}
          </button>
          <span className="badge badge--navy">{users.length} total</span>
        </div>
      </div>

      {/* Search */}
      <div className="au__search-wrap anim-fade-up delay-1">
        <div className="au__search">
          <Search size={15} className="au__search-icon"/>
          <input type="text" className="au__search-input"
            placeholder="Search by name, email, or college…"
            value={query} onChange={e => setQuery(e.target.value)}/>
          {query && <button className="au__search-clear" onClick={() => setQuery('')}><X size={13}/></button>}
        </div>
        {(query || hasFilters) && (
          <span className="au__results-count">{filtered.length} result{filtered.length!==1?'s':''}</span>
        )}
      </div>

      {/* Dropdown filters */}
      {showFilters && (
        <div className="au-dropdown-filters card anim-fade-up">
          <div className="au-dropdown-filters__inner">
            <div className="au-filter-group">
              <label>College</label>
              <select value={filterCollege} onChange={e => setFilterCollege(e.target.value)}>
                <option value="">All colleges</option>
                {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="au-filter-group">
              <label>Visitor Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                {VISITOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button className="au-filter-clear" onClick={clearFilters}>
                <X size={13}/> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="au__loading">Loading users…</div>
      ) : filtered.length === 0 ? (
        <div className="au__empty card">
          <Users size={32}/>
          <p>{query || hasFilters ? 'No users found.' : 'No users registered yet.'}</p>
        </div>
      ) : (
        <div className="au__table-wrap card anim-fade-up delay-2">
          <table className="au__table">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>College</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const vt = u.visitorType || (u.yearLevel === 'Faculty / Staff' ? 'Faculty / Staff' : 'Student');
                return (
                  <tr key={u.id} className={`anim-fade-up delay-${Math.min(i+1,5)}`}>
                    <td>
                      <div className="au__user-cell">
                        <div className="au__av" style={{background:getAvatarColor(u.name)}}>
                          {u.photoURL
                            ? <img src={u.photoURL} alt={u.name} referrerPolicy="no-referrer"/>
                            : getInitials(u.name)}
                        </div>
                        <div>
                          <div className="au__user-name">{u.name}</div>
                          <div className="au__user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`au-type-tag au-type-tag--${vt.replace(/\s\/\s/,'-').toLowerCase().replace(/\s/g,'-')}`}>
                        {vt === 'Faculty / Staff' ? '👩‍🏫' : vt === 'Student' ? '🎓' : '🏛️'} {vt}
                      </span>
                    </td>
                    <td><span className="au__college">{u.college || '—'}</span></td>
                    <td><span className="au__date">{formatDate(u.createdAt)}</span></td>
                    <td>
                      <span className={`badge ${u.blocked?'badge--red':'badge--green'}`}>
                        {u.blocked ? '⛔ Blocked' : '✓ Active'}
                      </span>
                    </td>
                    <td>
                      <div className="au__actions">
                        <button className="au__action-btn au__action-btn--edit"
                          onClick={() => setEditing(u)} title="Edit">
                          <Edit2 size={13}/>
                        </button>
                        <button
                          className={`au__action-btn ${u.blocked?'au__action-btn--unblock':'au__action-btn--block'}`}
                          onClick={() => toggleBlock(u)} disabled={blocking===u.id}
                          title={u.blocked?'Unblock':'Block'}>
                          {blocking===u.id
                            ? <span className="au__mini-spinner"/>
                            : u.blocked ? <CheckCircle size={13}/> : <Ban size={13}/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && <EditModal user={editing} onClose={() => setEditing(null)} onSave={handleSave}/>}
    </div>
  );
}