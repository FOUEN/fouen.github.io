(()=>{if("serviceWorker"in navigator&&window.siteConfig.swPath){let o=function(){_$(".notification-wrapper").classList.add("show")};r=o,_$("#notification-update-btn").onclick=()=>{try{navigator.serviceWorker.getRegistration().then(e=>{e.waiting.postMessage("skipWaiting")})}catch{window.location.reload()}},_$("#notification-close-btn").onclick=()=>{_$(".notification-wrapper").classList.remove("show")},navigator.serviceWorker.register(siteConfig.swPath).then(e=>{if(console.log("Service Worker \u6CE8\u518C\u6210\u529F: ",e),e.waiting){o();return}e.onupdatefound=()=>{console.log("Service Worker \u66F4\u65B0\u4E2D...");let n=e.installing;n.onstatechange=()=>{n.state==="installed"&&navigator.serviceWorker.controller&&o()}}}).catch(e=>{console.log("Service Worker \u6CE8\u518C\u5931\u8D25: ",e)});let i=!1;navigator.serviceWorker.addEventListener("controllerchange",()=>{i||(i=!0,window.location.reload())})}var r;})();
