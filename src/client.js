/** 小埋耶 — selected concept 1, design canvas 1487 × 1058. */
window.__ModuleLoader__.load({
  id: 'dsh-theme-umaru-yeah',
  factory: (require) => {
    const React = require('react');
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
    const ART = /*__UMARU_ASSETS__*/ {};
    const CSS = /*__UMARU_CSS__*/ "";
    const ID = 'dsh-theme-umaru-yeah';
    const ATTRIBUTE = 'data-umaru-yeah';
    const palette = {
      '--dsw-alias-bg-base':['#fdfaf3','#29211d'],
      '--dsw-alias-bg-layer-1':['#fffdf8','#322820'],
      '--dsw-alias-bg-layer-2':['#f9f1e4','#3d3027'],
      '--dsw-alias-bg-layer-3':['#f3e4d2','#4b392c'],
      '--dsw-alias-bg-overlay':['#fffdf8','#382b23'],
      '--dsw-alias-bg-module-platform':['#fdfaf3','#29211d'],
      '--dsw-alias-bg-multi-select':['#fed9b5','#65402b'],
      '--dsw-alias-bg-skeleton':['#efdfcd','#46362b'],
      '--dsw-alias-label-primary':['#4e3432','#fff0df'],
      '--dsw-alias-label-primary-bluish':['#352f3d','#fff0df'],
      '--dsw-alias-label-secondary':['#705650','#e3cbb7'],
      '--dsw-alias-label-tertiary':['#907568','#c6aa91'],
      '--dsw-alias-label-caption':['#a39490','#b49a84'],
      '--dsw-alias-label-dimmed':['#bfa99b','#8e7562'],
      '--dsw-alias-border-l1':['#ebc5a2','#8f5c3a'],
      '--dsw-alias-border-l2':['#f3e1cb','#73513c'],
      '--dsw-alias-border-l3':['#f5e5d2','#513b2e'],
      '--dsw-alias-border-l4':['#e6bf9c','#8a5b3a'],
      '--dsw-alias-border-l2-darkmode-thin':['#f3e1cb','#73513c'],
      '--dsw-alias-brand-primary':['#f68b39','#ffad68'],
      '--dsw-alias-brand-text':['#ffffff','#342118'],
      '--dsw-alias-brand-primary-invert':['#ffad68','#f68b39'],
      '--dsw-alias-button-primary-fill':['#fb9649','#f5a362'],
      '--dsw-alias-button-primary-hover':['#ed842e','#ffb67b'],
      '--dsw-alias-button-primary-dimmed':['#f6c59e','#98623d'],
      '--dsw-alias-button-info-fill':['#fb9649','#ec9957'],
      '--dsw-alias-button-info-hover':['#ed842e','#ffb67b'],
      '--dsw-alias-button-elevated-fill':['#fffdf8','#3b2e25'],
      '--dsw-alias-button-floating-fill':['#fffdf8','#3b2e25'],
      '--dsw-alias-button-floating-hover':['#fee6cd','#57402d'],
      '--dsw-alias-button-tool-bar-fill':['#fff8ef','#3b2e25'],
      '--dsw-alias-button-tool-bar-hover':['#ffe3c5','#57402d'],
      '--dsw-alias-button-ghost-active-border':['#f68b39','#f5a362'],
      '--dsw-alias-button-ghost-active-fill':['#fee6cd','#63402b'],
      '--dsw-alias-button-ghost-active-hover':['#fcd4ac','#765037'],
      '--dsw-alias-state-business-primary':['#dd772c','#ffad68'],
      '--dsw-alias-state-business-tertiary':['#fee6cd','#63402b'],
      '--dsw-alias-interactive-bg-hover':['#ffe1bf','#503728'],
      '--dsw-alias-interactive-bg-active':['#fecfa2','#69452e'],
      '--dsw-alias-interactive-bg-hover-solid':['#ffe1bf','#503728'],
      '--dsw-alias-interactive-bg-hover-accent':['#ffdab2','#63402b'],
      '--dsw-alias-markdown-code-block':['#f5ecdf','#30261f'],
      '--dsw-alias-markdown-code-block-banner':['#edddc9','#493526'],
      '--dsw-alias-markdown-inline-code':['#f2e5d4','#533a28'],
      '--dsw-alias-markdown-citation':['#f7eee2','#403025'],
      '--dsw-alias-separator-primary':['#f0d1ad','#674832'],
      '--dsw-alias-scrollbar-bg-l1':['#e5b98e','#895e3f'],
      '--dsw-alias-scrollbar-bg-l2':['#edccaa','#775037'],
      '--dsw-alias-scrollbar-hover-l1':['#cd8f56','#c18753'],
      '--dsw-alias-scrollbar-hover-l2':['#dba46f','#a97349'],
      '--dsw-specific-sidebar-fill':['#fee5ca','#35261e'],
      '--dsw-specific-sidebar-nav-item-active':['#fecfa2','#67422d'],
      '--dsw-specific-sidebar-nav-item-active-accent':['#fac28d','#785039'],
      '--dsw-specific-sidebar-nav-item-hover':['#ffdcba','#4f3526'],
      '--dsw-specific-bubble':['#feecd5','#62432d'],
      '--dsw-specific-bubble-highlight':['#f9c694','#7a5134'],
      '--dsw-specific-input-major':['#fdfcfb','#342820'],
      '--dsw-specific-login-input':['#fdfcfb','#342820'],
      '--dsw-specific-menu':['#fffdf8','#3a2d24'],
      '--dsw-specific-selector':['#fff1e0','#533a29'],
      '--dsw-specific-tip':['#fff4d9','#55462b']
    };
    const tokens = Object.fromEntries(Object.entries(palette).map(([key,[light,dark]]) => [key,{light,dark}]));

    // Crops reuse the selected PNG unchanged. No illustrated controls or messages
    // are shown: the measured polygons contain decoration only.
    function crop(className) {
      return React.createElement('span', {className:`umaru-crop ${className}`, 'aria-hidden':true},
        React.createElement('img', {src:ART.source, alt:'', draggable:false}));
    }
    function SidebarArtwork({wide}) {
      return wide ? React.createElement('div',{className:'umaru-sidebar-art','aria-hidden':true},crop('umaru-polaroid')) : null;
    }

    function HeaderCommandButton({useCommands,canInvoke,invokeCommand,commandId,className,Icon}) {
      const command=useCommands(rows=>rows.find(row=>row.id===commandId));
      // Missing commands or a changed DSH bridge leave the native sidebar
      // controls available instead of displaying a decorative, inert button.
      if(!command || !Icon || !canInvoke())return null;
      return React.createElement('button',{
        type:'button',className:`umaru-header-button ${className}`,
        'aria-label':command.label,'aria-keyshortcuts':command.aria,
        title:command.label,onClick:event=>{
          // Do not let this same click close the newly opened sidebar search.
          if(commandId==='session.search')event.stopPropagation();
          invokeCommand(commandId);
        }
      },React.createElement(Icon,{size:23,'aria-hidden':true}));
    }

    function installHeaderCommands(ctx) {
      // DSH 0.2.1-rc.3 uses this registry for native menu commands. Keep this
      // compatibility bridge optional and isolated: it opens the existing
      // rename dialog / session search and never edits a title itself.
      ctx.inject(['shortcuts'],scope=>{
        if(typeof scope.shortcuts?.catalog?.getSnapshot!=='function'
          || typeof scope.shortcuts?.catalog?.subscribe!=='function')return;
        const canInvoke=()=>typeof scope.shortcuts?.registry?.invoke==='function'
          && typeof scope.shortcuts?.catalog?.getSnapshot==='function'
          && typeof primitives.modalSelector==='string';
        const invokeCommand=commandId=>{
          if(!canInvoke() || !scope.shortcuts.catalog.getSnapshot().some(row=>row.id===commandId))return;
          let target=document.activeElement;
          while(target?.shadowRoot?.activeElement && !target.matches('webview[data-sidebar-browser-frame]'))target=target.shadowRoot.activeElement;
          const top=[...document.querySelectorAll(primitives.modalSelector)].at(-1);
          const context={
            target,
            region:target?.closest('.xterm')?'terminal':target?.matches('input, textarea, select, [contenteditable="true"], [contenteditable=""]')?'editable':'page',
            modal:top?.dataset.shortcutModal ?? (top? 'other':null)
          };
          try {
            scope.shortcuts.registry.invoke(commandId,context);
          } catch {
            // A future DSH version may change this internal bridge. Native
            // sidebar search and session menu remain the fallback.
            console.warn('小埋耶: native header command is unavailable',commandId);
          }
        };
        const register=(name,id,order,commandId,className,Icon)=>scope.slots.inject(name,()=>scope.slots.register({
          name,id,order,
          inject:()=>({hooks:{commands:scope.shortcuts.catalog},canInvoke,invokeCommand,commandId,className,Icon})
        },HeaderCommandButton));
        register('conversation.session.header.actions','umaru-rename',-100,'session.rename','umaru-rename',primitives.IconEditOutlineRegular);
        // Native open-in-app is -10; the native More menu uses the default 0.
        register('conversation.session.header.utilities','umaru-search',-1,'session.search','umaru-search',primitives.IconSearchOutlineRegular);
      });
    }

    function apply(ctx) {
      installHeaderCommands(ctx);
      ctx.effect(() => ctx.theme.overrideTokens(ID,tokens),'umaru: palette');
      ctx.effect(() => {
        const body=document.body;
        const previous=body.getAttribute(ATTRIBUTE);
        const oldScale=body.style.getPropertyValue('--umaru-scale');
        const style=document.createElement('style');
        style.dataset.plugin=ID;
        // Direct data declarations avoid Chromium's large custom-property limit.
        style.textContent=CSS + `\nbody[${ATTRIBUTE}] .umaru-room {background-image:url(${JSON.stringify(ART.room)})}\nbody[${ATTRIBUTE}] .umaru-original-art,body[${ATTRIBUTE}] .umaru-brand,body[${ATTRIBUTE}] .umaru-badge,body[${ATTRIBUTE}] [data-chat-flow-kind="user"] .LOmM4q_userStack::after,body[${ATTRIBUTE}] [data-chat-flow-kind="assistant-step"] .xMeOpW_body::before{background-image:url(${JSON.stringify(ART.source)})}`;
        document.head.appendChild(style);
        body.setAttribute(ATTRIBUTE,'1');
        const mounted=new Map();
        let frame=0;
        let disposed=false;
        const make=(className,parent) => {
          const element=document.createElement('div');
          element.className=className;
          element.setAttribute('aria-hidden','true');
          element.dataset.umaruOwned='';
          parent.prepend(element);
          return element;
        };
        const update=() => {
          frame=0;
          if(disposed)return;
          const shell=document.querySelector('[class$="_frame"]:has(> [class$="_sidebarCol"])');
          const root=document.querySelector('[data-slot="main"] [data-phase]:has(> [data-conversation-content])');
          const area=(root||shell)?.getBoundingClientRect();
          const chrome=!root&&shell ? parseFloat(getComputedStyle(shell).paddingTop)||0 : 0;
          const scale=Math.max(.62,Math.min(1.2,((area?.height||window.innerHeight)-chrome)/1058,window.innerWidth/1487));
          const value=scale.toFixed(5);
          if(body.style.getPropertyValue('--umaru-scale')!==value) body.style.setProperty('--umaru-scale',value);
          const targets=[...document.querySelectorAll('[data-slot="main"] [data-phase]:has(> [data-conversation-content])')];
          const logo=document.querySelector('[data-slot="sidebar"] .wtg9ga_root:not(.wtg9ga_collapsed) .wtg9ga_logoRow');
          if(logo)targets.push(logo);
          for(const [element,nodes] of mounted) if(!element.isConnected||!targets.includes(element)) {
            nodes.forEach(node=>node.remove()); mounted.delete(element);
          }
          for(const element of targets)if(!mounted.has(element)) {
            const names=element===logo?['umaru-brand','umaru-badge']:['umaru-original-art','umaru-room'];
            mounted.set(element,names.map(name=>make(name,element)));
          }
        };
        const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(update);};
        const observer=new MutationObserver(records=>{
          if(records.some(record=>record.type==='childList' || record.attributeName==='data-sidebar-collapsed'))schedule();
        });
        observer.observe(document.getElementById('root')||body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-sidebar-collapsed']});
        window.addEventListener('resize',schedule);
        update();
        return()=>{
          disposed=true;observer.disconnect();window.removeEventListener('resize',schedule);
          if(frame)cancelAnimationFrame(frame);
          for(const nodes of mounted.values())nodes.forEach(node=>node.remove());
          mounted.clear();style.remove();
          if(oldScale)body.style.setProperty('--umaru-scale',oldScale);else body.style.removeProperty('--umaru-scale');
          if(body.getAttribute(ATTRIBUTE)==='1') {
            if(previous===null)body.removeAttribute(ATTRIBUTE);else body.setAttribute(ATTRIBUTE,previous);
          }
        };
      },'umaru: scoped layout and source artwork');
      ctx.slots.inject('sidebar.footer.action',()=>ctx.slots.register({name:'sidebar.footer.action',id:'umaru-polaroid',order:15},SidebarArtwork));
    }
    return {inject:['theme','slots'],apply};
  }
});
