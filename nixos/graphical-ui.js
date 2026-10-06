#!/usr/bin/env gjs
imports.gi.versions.Gtk='4.0';
const {Gtk,Gdk,Gio,GLib,Pango,GdkPixbuf}=imports.gi;
const ByteArray=imports.byteArray;
const app=new Gtk.Application({application_id:'cloud.murakumo.Setup'});
let content,window,active=null,backend=null;
const label=(text,cls='body')=>{const w=new Gtk.Label({label:text,wrap:cls!=='brand',wrap_mode:Pango.WrapMode.WORD_CHAR,max_width_chars:44,xalign:0,selectable:false});w.add_css_class(cls);return w;};
const box=(orientation=Gtk.Orientation.VERTICAL,spacing=16)=>new Gtk.Box({orientation,spacing});
function button(text,callback,cls='secondary'){
  const w=new Gtk.Button({label:text});w.add_css_class(cls);w.connect('clicked',callback);return w;
}
function clear(){while(content.get_first_child())content.remove(content.get_first_child());}
function show(title,message){clear();content.append(label(title,'heading'));if(message)content.append(label(message));}
function heading(type,message,args){
  if(type==='--menu'){
    const ids=args.slice(args.indexOf(type)+5).filter((_,i)=>i%2===0);
    if(ids.includes('wifi')&&ids.includes('wired'))return 'ネットに接続';
    if(ids.some(x=>x.startsWith('/dev/')))return 'インストール先を選ぶ';
    if(ids.includes('retry'))return 'アカウントの連携を確認';
    if(ids.includes('network'))return 'Murakumoのセットアップ';
  }
  if(type==='--textbox')return 'アカウントを連携';
  if(type==='--passwordbox')return 'Wi-Fiに接続';
  if(message.includes('ERASE /dev/'))return 'このディスクにインストール';
  if(/\/dev\/(nvme|sd|vd|mmcblk)/.test(message))return 'インストール先を選ぶ';
  if(type==='--msgbox'&&/インストールが完了|Installation completed/.test(message))return '準備ができました';
  if(/停止|stopped|できません|見つかりません|unavailable|failed/i.test(message))return '操作を確認してください';
  if(/インストールしています|Installing/.test(message))return 'Murakumo OSをインストール';
  if(/準備しています|Preparing|確認しています|Checking|Verifying/.test(message))return '準備しています';
  return 'Murakumoへようこそ';
}
function serve(request,connection,input){
  const args=request.args;
  if(!Array.isArray(args)||args.some(x=>typeof x!=='string'))throw Error('Invalid UI request');
  const types=['--menu','--inputbox','--passwordbox','--msgbox','--infobox','--pause','--textbox'];
  const type=types.find(x=>args.includes(x));if(!type)throw Error('Unsupported UI request');
  const i=args.indexOf(type);let message=args[i+1]||'';
  const token={connection,type};active=token;
  const respond=(status,value='')=>{
    if(active!==token)return;
    try{connection.get_output_stream().write_all(ByteArray.fromString(JSON.stringify({status,value})+'\n'),null);}catch{}
    connection.close(null);active=null;
  };
  show(heading(type,message,args),type==='--textbox'?'スマホでQRを読み取り、Passkeyでログインしてください。\n端末IDとコードを確認して承認すると、自動で次へ進みます。':message.replace(/次の文字をそのまま入力してください：ERASE \/dev\/[^\n]+/,'').replace(/↑↓で選択、Enterで決定。/,'接続方法を選んでください。'));
  if(type==='--menu'){
    const choices=args.slice(i+5);
    const list=box(Gtk.Orientation.VERTICAL,10);
    for(let n=0;n<choices.length;n+=2){
      const key=choices[n],text=choices[n+1]||key;
      const b=new Gtk.Button();b.add_css_class('choice');
      const row=box(Gtk.Orientation.HORIZONTAL,16);
      const disk=key.startsWith('/dev/');
      const icon=new Gtk.Label({label:disk?'▤':key==='wifi'?'◎':key==='wired'?'↔':'›'});icon.add_css_class('choice-icon');row.append(icon);
      const words=box(Gtk.Orientation.VERTICAL,4);words.hexpand=true;words.append(label(disk?text.split('|')[0].trim():text,'choice-title'));
      if(disk)words.append(label(text.split('|').slice(1).join(' · ')+' · '+key,'muted'));
      row.append(words);row.append(new Gtk.Label({label:'›'}));b.set_child(row);b.connect('clicked',()=>respond(0,key));list.append(b);
    }
    const scroll=new Gtk.ScrolledWindow({child:list,propagate_natural_height:true,max_content_height:400,hscrollbar_policy:Gtk.PolicyType.NEVER});content.append(scroll);list.get_first_child()?.grab_focus();
  }else if(type==='--inputbox'||type==='--passwordbox'){
    const phrase=message.match(/ERASE \/dev\/(?:nvme\d+n\d+|sd[a-z]+|vd[a-z]+|mmcblk\d+)/)?.[0];
    if(phrase){
      const agree=new Gtk.CheckButton({label:'このディスクの全データを消去することを確認しました'});content.append(agree);
      const controls=box(Gtk.Orientation.HORIZONTAL,12);controls.halign=Gtk.Align.END;
      controls.append(button('戻る',()=>respond(1)));
      const erase=button('消去してインストール',()=>respond(0,phrase),'destructive');erase.sensitive=false;
      agree.connect('toggled',()=>erase.sensitive=agree.active);controls.append(erase);content.append(controls);agree.grab_focus();
    }else{
      const entry=type==='--passwordbox'?new Gtk.PasswordEntry({show_peek_icon:true}):new Gtk.Entry();entry.add_css_class('input');content.append(entry);
      const submit=()=>{const value=entry.get_text();entry.set_text('');respond(0,value);};entry.connect('activate',submit);
      const controls=box(Gtk.Orientation.HORIZONTAL,12);controls.halign=Gtk.Align.END;controls.append(button('戻る',()=>{entry.set_text('');respond(1);}));controls.append(button(type==='--passwordbox'?'接続する':'次へ',submit,'primary'));content.append(controls);entry.grab_focus();
    }
  }else if(type==='--textbox'){
    // Only the existing registration controller's private file is accepted.
    if(!/^\/run\/murakumo-ui\/approval\.[A-Za-z0-9]+\/qr\.txt$/.test(message))throw Error('Invalid approval path');
    const [ok,bytes]=GLib.file_get_contents(message);if(!ok)throw Error('Approval missing');
    const text=ByteArray.toString(bytes),uri=text.trim().split('\n').pop();
    if(!/^https:\/\/[^\s]+$/.test(uri))throw Error('Invalid approval URI');
    const png=message+'.png';
    const qr=Gio.Subprocess.new(['qrencode','-o',png,'-s','7','-m','2',uri],Gio.SubprocessFlags.NONE);
    if(!qr.wait_check(null))throw Error('QR generation failed');
    // Fixed-size, crisp QR modules keep long approval URIs within the page.
    const pixels=GdkPixbuf.Pixbuf.new_from_file(png).scale_simple(300,300,GdkPixbuf.InterpType.NEAREST);
    const picture=Gtk.Picture.new_for_paintable(Gdk.Texture.new_for_pixbuf(pixels));picture.set_size_request(300,300);picture.can_shrink=true;
    const row=box(Gtk.Orientation.HORIZONTAL,24),details=box(Gtk.Orientation.VERTICAL,16);details.hexpand=true;details.valign=Gtk.Align.CENTER;
    row.append(picture);row.append(details);
    for(const line of text.split('\n').filter(x=>/^(Code:|Device ID:)/.test(x)))details.append(label(line,'muted'));
    details.append(label('承認待ち · 有効期限5分','muted'));const later=button('あとで登録',()=>respond(1));details.append(later);content.append(row);later.grab_focus();
  }else if(type==='--infobox'||type==='--pause'){
    const spinner=new Gtk.Spinner({spinning:true,width_request:40,height_request:40,halign:Gtk.Align.START});content.append(spinner);
    // Busy updates are acknowledged immediately; installation runs separately
    // from the UI event loop. Pauses retain the caller's retry pacing.
    if(type==='--pause')GLib.timeout_add(GLib.PRIORITY_DEFAULT,2000,()=>{respond(0);return GLib.SOURCE_REMOVE;});else respond(0);
  }else{
    const next=button(/再起動|restart/i.test(message)?'再起動する':'続ける',()=>respond(0),'primary');content.append(next);next.grab_focus();
  }
  if(active===token){
    input.read_line_async(GLib.PRIORITY_DEFAULT,null,(stream,result)=>{
      try{stream.read_line_finish_utf8(result);}catch{}
      if(active===token){active=null;show('準備しています','次の画面へ進んでいます…');}
      try{connection.close(null);}catch{}
    });
  }
}
app.connect('activate',()=>{
  const css=new Gtk.CssProvider();css.load_from_string(`
    .choice-icon { font-size: 28px; min-width: 28px; color: #6776a0; }
window { background: linear-gradient(125deg,#f1efff,#f8faff 48%,#edf4ff); color:#20232d; }
    .card { background:rgba(255,255,255,0.97); border:1px solid #ffffff; border-radius:28px; padding:38px; box-shadow:0 20px 60px rgba(40,50,100,0.12); }
    .brand-logo { background:#253b62; border-radius:14px; padding:14px 20px; }
    .steps { font-size:13px; color:#777e92; }
    .heading { font-size:30px; font-weight:700; margin-top:12px; margin-bottom:6px; }
    .body { font-size:15px; color:#4f5668; }
    .muted { font-size:12px; color:#7a8193; }
    .choice-title { font-size:16px; font-weight:600; }
    button { border-radius:12px; padding:12px 18px; font-size:15px; border:1px solid #e5e8ef; background:#f8f9fc; box-shadow:none; }
    button:hover { background:#eef1ff; border-color:#b8c4f8; }
    .choice { padding:18px; background:#ffffff; }
    .primary { background:#4361e8; color:white; border-color:#4361e8; font-weight:600; }
    .primary:hover { background:#314ed7; }
    .destructive { background:#d74350; color:white; border-color:#d74350; }
    .destructive:disabled { background:#f3e7e9; color:#bba0a5; border-color:#f3e7e9; }
    .input { font-size:18px; padding:12px; border-radius:12px; }
    checkbutton { font-size:14px; padding:12px 0; }
  `);
  Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(),css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
  window=new Gtk.ApplicationWindow({application:app,title:'Murakumo Setup',default_width:1024,default_height:768});window.connect('close-request',()=>true);
  const outer=box(Gtk.Orientation.VERTICAL,20);outer.halign=Gtk.Align.CENTER;outer.valign=Gtk.Align.CENTER;outer.set_size_request(760,-1);outer.margin_top=30;outer.margin_bottom=30;
  const card=box(Gtk.Orientation.VERTICAL,20);card.add_css_class('card');
  const header=box(Gtk.Orientation.HORIZONTAL,0);header.halign=Gtk.Align.START;header.add_css_class('brand-logo');
  const logo=Gtk.Picture.new_for_paintable(Gdk.Texture.new_from_filename('/etc/murakumo/logo.png'));logo.set_size_request(240,37);logo.can_shrink=true;logo.set_alternative_text('Murakumo');header.append(logo);card.append(header);
  card.append(label('ネット接続    ›    インストール    ›    アカウント連携','steps'));
  content=box(Gtk.Orientation.VERTICAL,18);card.append(content);outer.append(card);outer.append(label('Murakumo OS · インストールはオフラインでも完了できます','muted'));
  const viewport=new Gtk.ScrolledWindow({child:outer,hscrollbar_policy:Gtk.PolicyType.NEVER});window.set_child(viewport);show('Murakumoへようこそ','セットアップを準備しています…');window.fullscreen();window.present();
  const socketPath=GLib.getenv('MURAKUMO_UI_SOCKET');
  if(!socketPath||!socketPath.startsWith('/run/murakumo-ui/'))throw Error('Missing private socket');
  const service=new Gio.SocketService();service.add_address(new Gio.UnixSocketAddress({path:socketPath}),Gio.SocketType.STREAM,Gio.SocketProtocol.DEFAULT,null);Gio.File.new_for_path(socketPath).set_attribute_uint32('unix::mode',0o600,Gio.FileQueryInfoFlags.NONE,null);
  service.connect('incoming',(_,connection)=>{
    const input=new Gio.DataInputStream({base_stream:connection.get_input_stream()});
    input.read_line_async(GLib.PRIORITY_DEFAULT,null,(stream,result)=>{
      try{const [line]=stream.read_line_finish_utf8(result);if(!line||line.length>1048576)throw Error('Invalid request');serve(JSON.parse(line),connection,input);}
      catch(e){logError(e);try{connection.close(null);}catch{}show('画面を表示できません','操作を停止しました。電源を切らず、保守担当者にご連絡ください。');}
    });return true;
  });service.start();
  const launcher=new Gio.SubprocessLauncher({flags:Gio.SubprocessFlags.NONE});launcher.set_stdout_file_path(GLib.getenv('MURAKUMO_UI_SESSION')+'/backend.log');launcher.set_stderr_file_path(GLib.getenv('MURAKUMO_UI_SESSION')+'/backend-error.log');
  // Marker precedes spawn: compositor failure must never trigger a second erase.
  GLib.file_set_contents(GLib.getenv('MURAKUMO_UI_SESSION')+'/started','1');backend=launcher.spawnv(ARGV);
  backend.wait_async(null,(child,result)=>{child.wait_finish(result);GLib.file_set_contents(GLib.getenv('MURAKUMO_UI_SESSION')+'/result',String(child.get_if_exited()?child.get_exit_status():1));if(!active){const ok=child.get_successful();show(ok?'セットアップを完了しました':'セットアップを停止しました',ok?'まもなく再起動または電源の終了を行います。':'再インストールを繰り返さず、状態を確認してください。');if(!ok)content.append(button('電源を切る',()=>Gio.Subprocess.new(['systemctl','poweroff'],Gio.SubprocessFlags.NONE)));}});
});
app.run([]);
