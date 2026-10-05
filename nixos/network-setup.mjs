import {spawnSync} from 'node:child_process';

export const text = (ja, en) => process.env.MURAKUMO_UI_LANG === 'ja' ? ja : en;
// SSIDs are untrusted display text. Keep the original separately for nmcli.
export const displayText = s => String(s).replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').replace(/\\/g, '\uFF3C');
export function rows(value) {
  return value.trimEnd().split('\n').filter(Boolean).map(line => {
    const out = ['']; let escape = false;
    for (const c of line) {
      if (escape) { out[out.length - 1] += c; escape = false; }
      else if (c === '\\') escape = true;
      else if (c === ':') out.push('');
      else out[out.length - 1] += c;
    }
    if (escape) out[out.length - 1] += '\\';
    return out;
  });
}
export function networks(value) {
  const unique = new Map();
  for (const [ssid, signal, security] of rows(value)) {
    if (!ssid) continue;
    const item = {ssid, signal: Number(signal) || 0, security: security || '--'};
    if (!unique.has(ssid) || unique.get(ssid).signal < item.signal) unique.set(ssid, item);
  }
  return [...unique.values()].sort((a,b) => b.signal - a.signal);
}
export function dialogUI(stage) {
  function screen(args) {
    const r = spawnSync('dialog', [...(args.includes('--infobox') ? [] : ['--clear']), '--stdout', '--no-collapse', '--title', 'Murakumo',
      '--backtitle', stage === 'installer' ? text('1 ネット接続 → 2 インストール → 3 スマホで登録', '1 Network → 2 Install → 3 Phone registration') : text('インストール完了 · ネット接続 → スマホで登録', 'OS installed · Network → Phone registration'),
      '--ok-label', text('次へ', 'Continue'), '--cancel-label', text('戻る', 'Back'), ...args],
      {stdio: ['inherit','pipe','inherit'], env: {...process.env, TERM: 'linux', LC_ALL: 'C.UTF-8'}});
    if (r.error) throw r.error;
    return r.status === 0 ? r.stdout.toString().replace(/\n$/, '') : null;
  }
  return {
    menu: (message, items) => screen(['--no-tags','--menu',message,'0','0','9',...items.flat()]),
    input: message => screen(['--inputbox',message,'0','0']),
    password: message => screen(['--insecure','--passwordbox',message,'0','0']),
    message: message => screen(['--msgbox',message,'0','0']),
    busy: message => screen(['--infobox',message,'0','0']),
    pause: message => screen(['--pause',message,'0','0','2']),
  };
}
function command(program, args, options = {}) {
  return spawnSync(program,args,{encoding:'utf8',timeout:35000,env:{...process.env,LC_ALL:'C'},...options});
}
export function networkBackend(run = command, fetcher = fetch) {
  const nm = args => run('nmcli', args);
  return {
    devices: () => rows(nm(['-t','-f','DEVICE,TYPE,STATE','device','status']).stdout || '')
      .map(([name,type,state]) => ({name,type,connected: state.startsWith('connected')})).filter(d => ['wifi','ethernet'].includes(d.type)),
    scan: device => {
      nm(['radio','wifi','on']);
      const r = nm(['-t','-f','SSID,SIGNAL,SECURITY','device','wifi','list','ifname',device,'--rescan','yes']);
      return r.status === 0 ? networks(r.stdout || '') : [];
    },
    connectWifi: (device, ssid, password, hidden = false) => {
      // Never put the password in argv, the shell, service logs, or the Nix store.
      const r = run('nmcli',['--ask','--wait','25','device','wifi','connect',ssid,'ifname',device,...(hidden ? ['hidden','yes'] : [])],
        {input: `${password}\n`,stdio:['pipe','pipe','pipe']});
      return r.status === 0;
    },
    connectWired: device => nm(['--wait','15','device','connect',device]).status === 0,
    probe: async () => {
      let internet = false, murakumo = false;
      try {
        const r = await fetcher('https://connectivitycheck.gstatic.com/generate_204',{redirect:'error',signal:AbortSignal.timeout(5000)});
        internet = r.status === 204; await r.body?.cancel();
      } catch {}
      try {
        const r = await fetcher('https://murakumo.cloud/',{redirect:'error',signal:AbortSignal.timeout(5000)});
        murakumo = r.ok; await r.body?.cancel();
      } catch {}
      // Reachable HTTPS Murakumo also proves an external connection if the probe is filtered.
      return {internet: internet || murakumo, murakumo};
    },
  };
}
export async function setupNetwork({stage = 'installer', ui = dialogUI(stage), backend = networkBackend(), registered = false} = {}) {
  const later = text(stage === 'installer' ? '接続せずにインストールする' : '登録はあとで行う', stage === 'installer' ? 'Install without a connection' : 'Register later');
  const help = text('↑↓で選択、Enterで決定。Wi-Fiだけでも利用できます。', 'Select with arrows and Enter. Ethernet is optional.');
  const check = async () => {
    ui.busy(text('接続を確認しています…', 'Checking the connection…'));
    const state = await backend.probe();
    const message = [text('ネットワーク：接続済み','Network: connected'),
      text(`インターネット：${state.internet ? '接続済み' : '確認できません'}`,`Internet: ${state.internet ? 'connected' : 'not confirmed'}`),
      text(`Murakumo：${state.murakumo ? (registered ? '到達しました（登録状態を確認できます）' : '到達しました（登録はこれから）') : '到達できません'}`,`Murakumo: ${state.murakumo ? (registered ? 'reachable (ready to verify registration)' : 'reachable (registration pending)') : 'unreachable'}`)].join('\n');
    const next = ui.menu(message, [
      ...(state.internet ? [['next',text(stage === 'installer' ? 'インストールへ進む' : registered ? '登録状態を確認する' : 'スマホで登録する',stage === 'installer' ? 'Continue to installation' : registered ? 'Verify registration' : 'Register using your phone')]] : []),
      ['settings',text('接続方法を変更・再試行','Change connection / retry')], ['later',later],
    ]);
    return next === 'next' ? 'connected' : next === 'later' ? 'offline' : null;
  };
  // Saved Wi-Fi and already connected Ethernet need no repeated password entry.
  if (backend.devices().some(d => d.connected)) { const r = await check(); if (r) return r; }
  for (;;) {
    const choice = ui.menu(`${help}\n\n${text('インストールはネットなしでも完了します。登録にはネット接続が必要です。','OS installation works offline. Account registration needs Internet.')}`,
      [['wifi',text('Wi-Fiに接続する','Connect to Wi-Fi')],['wired',text('LANケーブルで接続する','Connect with an Ethernet cable')],['later',later]]);
    if (!choice || choice === 'later') return 'offline';
    const devices = backend.devices().filter(d => d.type === (choice === 'wifi' ? 'wifi' : 'ethernet'));
    if (!devices.length) {
      ui.message(text(choice === 'wifi' ? 'Wi-Fi機器が見つかりません。無線が有効か確認してください。有線接続、またはあとで接続も選べます。' : '有線LAN機器が見つかりません。Wi-Fi、またはあとで接続を選べます.', choice === 'wifi' ? 'No Wi-Fi adapter found. Check the wireless switch, use Ethernet, or connect later.' : 'No Ethernet adapter found. Use Wi-Fi or connect later.'));
      continue;
    }
    const device = devices.length === 1 ? devices[0].name : ui.menu(text('接続に使う機器を選んでください','Choose a network adapter'), devices.map(d => [d.name,displayText(d.name)]));
    if (!device) continue;
    if (devices.some(d => d.name === device && d.connected)) { const result = await check(); if (result) return result; continue; }
    let connected;
    if (choice === 'wired') {
      ui.busy(text('LANケーブルをルーターへ接続してください。接続を確認しています…','Connect the Ethernet cable to your router. Checking…'));
      connected = backend.connectWired(device);
    } else {
      ui.busy(text('近くのWi-Fiを探しています…','Scanning for Wi-Fi…'));
      const list = backend.scan(device);
      const selected = ui.menu(text('Wi-Fiを選んでください。電波の強い順に表示しています。','Choose Wi-Fi. Strongest signal first.'),[
        ...list.map((n,i) => [String(i),`${displayText(n.ssid)}  ${n.signal}%  ${n.security === '--' ? text('鍵なし','Open') : text('鍵あり','Secured')}`]),
        ['rescan',text('一覧を更新する','Refresh')],['hidden',text('非表示のWi-Fiを入力する','Enter a hidden network')],
      ]);
      if (!selected || selected === 'rescan') continue;
      const network = selected === 'hidden' ? {ssid: ui.input(text('Wi-Fi名（SSID）を入力してください','Enter the Wi-Fi name (SSID)')), security: 'hidden'} : list[Number(selected)];
      if (!network?.ssid) continue;
      if (network.security.includes('802.1X')) {
        ui.message(text('会社向け認証のWi-Fiです。この案内では設定できません。別のWi-Fi、有線LAN、または保守画面の詳細設定をご利用ください。','Enterprise Wi-Fi needs advanced configuration. Use another network, Ethernet, or maintenance settings.')); continue;
      }
      const password = network.security === '--' ? '' : ui.password(text(`${displayText(network.ssid)}\nWi-Fiのパスワードを入力してください。Murakumo用パスワードではありません。`,`${displayText(network.ssid)}\nEnter the Wi-Fi password, not a Murakumo password.`));
      if (password === null) continue;
      ui.busy(text('Wi-Fiに接続しています…','Connecting to Wi-Fi…'));
      connected = backend.connectWifi(device, network.ssid, password, selected === 'hidden');
    }
    if (!connected) {
      ui.message(text('接続できませんでした。Wi-Fiのパスワード、電波、またはLANケーブルを確認して、もう一度お試しください。別の方法や「あとで接続」も選べます。','Could not connect. Check the Wi-Fi password, signal, or cable. Try again, choose another method, or connect later.')); continue;
    }
    const result = await check(); if (result) return result;
  }
}
