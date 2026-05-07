"use client";

import { useEffect, useState } from "react";
import { Copy, Flame, LogOut, Plus, RefreshCw, Users } from "lucide-react";
import {
  createSharedGroup,
  fetchSharedGroups,
  joinSharedGroup,
  leaveSharedGroup,
} from "@/services/social/socialService";
import type { SharedStreakGroup } from "@/types/social";

export default function SocialPage() {
  const [groups, setGroups] = useState<SharedStreakGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  async function loadGroups(showSpinner = false) {
    if (showSpinner) setLoading(true);
    try {
      setGroups(await fetchSharedGroups());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las rachas compartidas.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    void loadGroups(true);
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = groupName.trim();
    if (name.length < 3) {
      setError("El nombre del grupo debe tener al menos 3 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const created = await createSharedGroup({ name });
      setGroups((current) => [created, ...current.filter((group) => group.id !== created.id)]);
      setGroupName("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grupo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = inviteCode.trim().toUpperCase();
    if (!normalizedCode) {
      setError("Escribe un código de invitación.");
      return;
    }

    setSaving(true);
    try {
      const joined = await joinSharedGroup({ invite_code: normalizedCode });
      setGroups((current) => [joined, ...current.filter((group) => group.id !== joined.id)]);
      setInviteCode("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo unir al grupo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLeave(groupId: number) {
    setSaving(true);
    try {
      await leaveSharedGroup(groupId);
      setGroups((current) => current.filter((group) => group.id !== groupId));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo salir del grupo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-[24px] pb-[80px]">
      <div className="flex items-center justify-between gap-[14px]">
        <div>
          <h2 className="text-[30px] leading-[1.05] font-bold">Rachas compartidas</h2>
          <p className="text-white/74 text-[15px]">Grupos privados por invitación</p>
        </div>
        <button
          onClick={() => void loadGroups(true)}
          className="w-[48px] h-[48px] rounded-full bg-white/18 text-white grid place-items-center transition-transform active:scale-95"
          aria-label="Actualizar"
        >
          <RefreshCw className="size-5" />
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-[14px] md:grid-cols-2">
        <form onSubmit={handleCreate} className="rounded-[24px] bg-white/13 border border-white/20 p-[18px] space-y-[12px]">
          <div className="flex items-center gap-[10px]">
            <Plus className="size-5 text-[var(--purple2)]" />
            <h3 className="text-[16px] font-bold">Crear grupo</h3>
          </div>
          <input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Nombre del grupo"
            maxLength={120}
            className="h-[46px] w-full rounded-[16px] border border-white/15 bg-white/10 px-[14px] text-[14px] text-white placeholder:text-white/45 outline-none focus:border-[var(--purple2)]"
          />
          <button
            disabled={saving}
            className="h-[46px] w-full rounded-[16px] bg-[var(--purple)] text-[14px] font-bold text-white disabled:opacity-60"
          >
            Crear racha
          </button>
        </form>

        <form onSubmit={handleJoin} className="rounded-[24px] bg-white/13 border border-white/20 p-[18px] space-y-[12px]">
          <div className="flex items-center gap-[10px]">
            <Users className="size-5 text-[#36d98f]" />
            <h3 className="text-[16px] font-bold">Unirme</h3>
          </div>
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            placeholder="Código de invitación"
            className="h-[46px] w-full rounded-[16px] border border-white/15 bg-white/10 px-[14px] text-[14px] uppercase tracking-[0.08em] text-white placeholder:normal-case placeholder:tracking-normal placeholder:text-white/45 outline-none focus:border-[#36d98f]"
          />
          <button
            disabled={saving}
            className="h-[46px] w-full rounded-[16px] bg-[#238a5a] text-[14px] font-bold text-white disabled:opacity-60"
          >
            Unirme al grupo
          </button>
        </form>
      </div>

      <div className="space-y-[14px]">
        <h3 className="text-[18px] font-bold">Mis grupos</h3>
        {groups.length === 0 ? (
          <div className="rounded-[24px] bg-white/10 border border-white/20 p-[24px] text-center text-[14px] text-white/74">
            Crea un grupo privado o únete con un código para compartir progreso agregado.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="rounded-[24px] bg-white/13 border border-white/20 p-[18px] space-y-[14px]">
              <div className="flex items-start justify-between gap-[12px]">
                <div className="min-w-0">
                  <h4 className="text-[18px] font-bold truncate">{group.name}</h4>
                  <p className="text-[13px] text-white/66">{group.member_count} miembros compartiendo</p>
                </div>
                <div className="rounded-[16px] bg-orange-500/20 px-[12px] py-[8px] text-right">
                  <Flame className="size-4 inline text-orange-300 mr-1" />
                  <span className="text-[18px] font-black">{group.shared_streak.current}</span>
                  <span className="text-[11px] text-white/70"> días</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[10px]">
                <div className="rounded-[16px] bg-white/10 p-[12px]">
                  <p className="text-[11px] text-white/60 font-bold uppercase">Hoy</p>
                  <p className="text-[18px] font-black">
                    {group.shared_streak.today_completed_members}/{group.shared_streak.required_members}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(group.invite_code)}
                  className="rounded-[16px] bg-white/10 p-[12px] text-left transition-colors hover:bg-white/16"
                >
                  <p className="text-[11px] text-white/60 font-bold uppercase">Código</p>
                  <p className="text-[16px] font-black tracking-[0.08em]">
                    <Copy className="size-3 inline mr-1" />
                    {group.invite_code}
                  </p>
                </button>
              </div>

              {group.members?.length ? (
                <div className="space-y-[8px]">
                  {group.members.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between rounded-[14px] bg-white/8 px-[12px] py-[10px]">
                      <span className="text-[14px] font-bold">{member.username}</span>
                      <span className={`text-[12px] font-bold ${member.today_completed ? "text-[#36d98f]" : "text-white/55"}`}>
                        {member.today_completed ? "Completó hoy" : "Pendiente hoy"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                onClick={() => void handleLeave(group.id)}
                disabled={saving}
                className="inline-flex h-[40px] items-center gap-[8px] rounded-[14px] bg-red-500/14 px-[14px] text-[13px] font-bold text-red-200 disabled:opacity-60"
              >
                <LogOut className="size-4" />
                Dejar de compartir
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
