/* RecycleQuest standalone runtime.
   Provides window.claude.use('user' | 'db' | 'downloads') for the app, backed by Supabase
   (anonymous sign-in + one "docs" table) and the browser. */
(function () {
  'use strict';
  if (typeof window !== 'undefined') window.RQ_RUNTIME = 5;

  function makeDB(sb) {
    var uuid = function () { return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); };
    var mkDoc = function (r) { return { id: r.id, exists: true, data: function () { return r.data; } }; };

    function collection(path) {
      return {
        doc: function (id) {
          id = id || uuid();
          return {
            id: id,
            get: async function () {
              var res = await sb.from('docs').select('data').eq('collection', path).eq('id', id).maybeSingle();
              if (res.error) throw res.error;
              return res.data
                ? { exists: true, id: id, data: function () { return res.data.data; } }
                : { exists: false, id: id, data: function () { return undefined; } };
            },
            set: async function (v) {
              var res = await sb.from('docs').upsert(
                { collection: path, id: id, data: v, updated_at: new Date().toISOString() },
                { onConflict: 'collection,id' });
              if (res.error) throw res.error;
            },
            delete: async function () {
              var res = await sb.from('docs').delete().eq('collection', path).eq('id', id);
              if (res.error) throw res.error;
            }
          };
        },

        onSnapshot: function (cb, errCb) {
          var rows = new Map(), dead = false, ch = null, timer = null, first = true;

          async function load() {
            if (dead) return;
            try {
              var res = await sb.from('docs').select('id,data,updated_at').eq('collection', path);
              if (res.error) throw res.error;
              if (dead) return;
              var seen = new Set(), changes = [];
              res.data.forEach(function (r) {
                seen.add(r.id);
                var old = rows.get(r.id);
                if (!old) changes.push({ type: 'added', row: r });
                else if (old.updated_at !== r.updated_at) changes.push({ type: 'modified', row: r });
                rows.set(r.id, r);
              });
              rows.forEach(function (r, k) { if (!seen.has(k)) { changes.push({ type: 'removed', row: r }); rows.delete(k); } });
              if (first || changes.length) { first = false; emit(changes); }
            } catch (e) { if (errCb) errCb(e); }
          }

          function emit(changes) {
            if (dead) return;
            var docs = Array.from(rows.values()).map(mkDoc);
            cb({
              docs: docs,
              docChanges: function () { return changes.map(function (c) { return { type: c.type, doc: mkDoc(c.row) }; }); }
            });
          }

          try {
            ch = sb.channel('docs:' + path + ':' + uuid())
              .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'collection=eq.' + path }, function () { load(); })
              .subscribe(function (status) { if (status === 'SUBSCRIBED') load(); });
          } catch (e) { /* realtime unavailable: polling below still works */ }
          load();
          timer = setInterval(load, 20000); // safety net if realtime isn't enabled

          return function () {
            dead = true;
            clearInterval(timer);
            try { if (ch) sb.removeChannel(ch); } catch (e) {}
          };
        }
      };
    }
    return { collection: collection };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { makeDB: makeDB }; return; }

  var cfg = window.RQ_SUPABASE || {}, sb = null;

  function client() {
    if (sb) return sb;
    if (!cfg.url || !cfg.anonKey) { window.RQ_STATUS = 'config.js has no Supabase URL/key (not saved, not redeployed, or old cached copy)'; return null; }
    if (!window.supabase) { window.RQ_STATUS = 'Supabase library did not load (offline or blocked)'; return null; }
    sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    return sb;
  }
  // Real accounts: a username is stored as the Supabase email "<username>@rq-players.app".
  // Supabase guarantees emails are unique, so usernames are unique (case-insensitive) and the
  // same username + password gives the same user id on every device.
  var DOMAIN = '@rq-players.app';
  function emailOf(n) { return String(n).trim().toLowerCase() + DOMAIN; }
  function getUser(c) {
    return c.auth.getSession().then(function (s) { return s.data && s.data.session ? s.data.session.user : null; });
  }
  window.RQ_AUTH = {
    enabled: function () { return !!client(); },
    user: async function () { var c = client(); return c ? getUser(c) : null; },
    available: async function (n) {
      var c = client(); if (!c) throw new Error('offline');
      var r = await c.rpc('username_available', { u: String(n).trim().toLowerCase() });
      if (r.error) throw r.error;
      return !!r.data;
    },
    signUp: async function (n, pw) {
      var c = client(); if (!c) throw new Error('offline');
      var r = await c.auth.signUp({ email: emailOf(n), password: pw, options: { data: { username: String(n).trim() } } });
      if (r.error) throw r.error;
      if (!r.data.session) throw new Error('confirm_email_on');
      return r.data.user;
    },
    signIn: async function (n, pw) {
      var c = client(); if (!c) throw new Error('offline');
      var r = await c.auth.signInWithPassword({ email: emailOf(n), password: pw });
      if (r.error) throw r.error;
      return r.data.user;
    },
    signOut: async function () { var c = client(); if (c) await c.auth.signOut(); }
  };

  if (!window.claude) {
    window.claude = {
      use: async function (n) {
        if (n === 'downloads') {
          return { save: async function (o) {
            var b = new Blob([o.data], { type: 'text/csv' }), a = document.createElement('a');
            a.href = URL.createObjectURL(b); a.download = o.filename || 'download.csv';
            document.body.appendChild(a); a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
          } };
        }
        if (n === 'user' || n === 'db') {
          var c = client(); if (!c) return null;
          var u; try { u = await getUser(c); } catch (e) { window.RQ_STATUS = 'session error: ' + (e && e.message ? e.message : e); return null; }
          if (!u) { window.RQ_STATUS = 'not signed in'; return null; }
          if (n === 'user') return { me: async function () { return { id: u.id, name: (u.user_metadata && u.user_metadata.username) || 'Player' }; } };
          return makeDB(c);
        }
        return null;
      }
    };
  }
})();