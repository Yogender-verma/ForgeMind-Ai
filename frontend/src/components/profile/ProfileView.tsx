import React, { useState } from 'react';
import { UserProfile } from '../auth/AuthPage';
import { updateCurrentUserProfile } from '../../services/firebase';

interface ProfileViewProps {
  user: UserProfile;
  onUpdateUser?: (updated: UserProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [facility, setFacility] = useState(user.facility || 'Plant Alpha');
  const [role, setRole] = useState(user.role || 'Industrial Quality Lead');
  const [department, setDepartment] = useState(user.department || 'Surface Integrity & NDT QA');
  const [phone, setPhone] = useState(user.phone || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  const handleCopyUid = () => {
    if (user.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleStartEditing = () => {
    setName(user.name || '');
    setFacility(user.facility || 'Plant Alpha');
    setRole(user.role || 'Industrial Quality Lead');
    setDepartment(user.department || 'Surface Integrity & NDT QA');
    setPhone(user.phone || '');
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setErrorMsg(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Display name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await updateCurrentUserProfile({
        name,
        facility,
        role,
        department,
        phone,
      });

      if (onUpdateUser) {
        onUpdateUser(updated);
      }

      setSuccessMsg('Profile updated successfully.');
      setIsEditing(false);

      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setErrorMsg(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header with Title and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-white tracking-tight flex items-center gap-2.5">
            <span>Engineer Profile</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-mono font-normal">
              Identity & Plant Access
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Authenticated credentials, production plant assignments, and industrial authorization.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            id="edit-profile-btn"
            onClick={handleStartEditing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/50 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-semibold tracking-wide transition shadow-[0_0_15px_rgba(0,229,255,0.15)] active:scale-95 self-start sm:self-auto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="text-base">✓</span>
            <span className="font-medium">{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-white text-sm px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚠</span>
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-white text-sm px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Profile Content: Edit Form vs View Mode */}
      {isEditing ? (
        /* Edit Mode Form */
        <form
          onSubmit={handleSaveProfile}
          className="rounded-3xl p-6 sm:p-8 bg-slate-950/90 border border-cyan-500/30 space-y-6 shadow-[0_15px_40px_rgba(0,0,0,0.8)] relative overflow-hidden animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                Edit Engineer Information
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Changes sync directly to production records
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Display Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Full Name / Display Name</span>
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Henderson"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 focus:border-cyan-400 text-white text-sm outline-none transition font-sans"
              />
            </div>

            {/* Assigned Facility */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Assigned Production Facility
              </label>
              <input
                type="text"
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                placeholder="e.g. Plant Alpha (Central Line)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 focus:border-cyan-400 text-white text-sm outline-none transition font-sans"
              />
            </div>

            {/* Security Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Security Role / Designation
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Industrial Quality Lead"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 focus:border-cyan-400 text-white text-sm outline-none transition font-sans"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Production Department / Gate
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Surface Integrity & NDT QA"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 focus:border-cyan-400 text-white text-sm outline-none transition font-sans"
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Direct Contact / Line Extension
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 019-4820"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 focus:border-cyan-400 text-white text-sm outline-none transition font-sans"
              />
            </div>

            {/* Read-only Email info */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-400">
                Authentication Email <span className="text-[10px] text-slate-500 font-mono">(Managed by {user.authProvider.toUpperCase()})</span>
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/40 border border-white/10 text-slate-400 text-sm cursor-not-allowed font-mono"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleCancelEditing}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wide transition shadow-[0_0_20px_rgba(0,229,255,0.3)] disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* View Mode Card */
        <div className="rounded-3xl p-6 sm:p-8 bg-slate-950/80 border border-white/10 space-y-6 shadow-xl">
          {/* Avatar and Primary Identity */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 font-bold text-3xl font-heading shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                {(user.name || 'E').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-xl font-bold font-heading text-white">{user.name}</h3>
              <p className="text-xs font-mono text-cyan-400">{user.email}</p>
              <div className="flex items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-white/10 text-[10px] font-mono text-slate-300 uppercase">
                  <span>Provider:</span>
                  <strong className="text-cyan-300">{user.authProvider}</strong>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                  <span>Active Session</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs font-mono">
            {/* User UID with Copy */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
                <span>User UID</span>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="text-cyan-400 hover:text-cyan-300 text-[10px] lowercase hover:underline"
                >
                  {copiedUid ? '✓ copied' : 'copy'}
                </button>
              </div>
              <div className="text-slate-200 truncate font-mono text-[11px]">{user.uid}</div>
            </div>

            {/* Assigned Facility */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Assigned Facility</span>
              <div className="text-slate-200 font-semibold">{user.facility || 'Plant Alpha'}</div>
            </div>

            {/* Security Role */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Security Role</span>
              <div className="text-emerald-400 font-bold">{user.role || 'Industrial Quality Lead'}</div>
            </div>

            {/* Department */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Production Department</span>
              <div className="text-slate-200">{user.department || 'Surface Integrity & NDT QA'}</div>
            </div>

            {/* Direct Contact Phone */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Direct Contact / Extension</span>
              <div className="text-slate-200">{user.phone || 'Not configured'}</div>
            </div>

            {/* Session Status */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Authentication Security</span>
              <div className="text-cyan-300 flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Verified Production Access</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
