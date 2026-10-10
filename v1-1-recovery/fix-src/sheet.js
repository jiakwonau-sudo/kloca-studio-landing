function Gt({emoji,title,sub,children,headerExtra,fullTitle=false}) {
 var {state,dispatch}=M();var stacked=state.modalStack.length>1;
 var titleBlock=j.jsxs('div',{className:'kloca-sheet-heading',children:[j.jsx('div',{className:'sheet-title',children:title}),sub&&j.jsx('div',{className:'sheet-sub',children:sub})]});
 return j.jsxs(j.Fragment,{children:[
  j.jsx('div',{className:'sheet-backdrop',onClick:()=>dispatch({type:'closeAll'})}),
  j.jsxs('div',{className:'sheet'+(fullTitle?' kloca-full-title':''),role:'dialog','aria-modal':true,'aria-label':typeof title==='string'?title:undefined,children:[
   j.jsx('div',{className:'sheet-grip'}),
   j.jsxs('div',{className:'sheet-head',children:[
    stacked&&j.jsx('button',{className:'icon-btn',onClick:()=>dispatch({type:'pop'}),'aria-label':'이전으로',children:j.jsx(Ye,{size:16})}),
    j.jsxs('div',{className:'sheet-title-row',children:[emoji!=null&&j.jsx('div',{className:'sheet-emoji',children:emoji}),!fullTitle&&titleBlock]}),
    headerExtra,j.jsx('button',{className:'icon-btn',onClick:()=>dispatch({type:'closeAll'}),'aria-label':'닫기',children:j.jsx(Je,{size:15})})
   ]}),
   fullTitle&&j.jsx('div',{className:'kloca-sheet-full-heading',children:titleBlock}),
   j.jsx('div',{className:'sheet-body',children})
  ]})
 ]});
}
