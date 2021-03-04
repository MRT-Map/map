
// let results = $("#search__results")
//
// function loop() {
//
//   if (window.innerWidth < 1000) {
//
//     scrollOffset = results.scrollTop();
//
//     if (scrollOffset > 400) scrollOffset = 400;
//
//     results.css("transform", `translateY(calc(${(400 - scrollOffset)/10}vh))`)
//     results.css("height", `calc(${(scrollOffset + 100)/10}vh - 50px)`)
//
//   } else {
//     results.css("transform", 'none')
//   }
//
//   requestAnimationFrame(loop);
// }
//
// loop();

var scrollOffset = 0;
var lastY = 0

$(".pill").on(
    'touchstart',
    (e) => {
      var touchobj = e.changedTouches[0]
      lastY = parseInt(touchobj.clientY)
      e.preventDefault();
    }
);

$(".pill").on(
    'touchmove',
    (e) => {
      let container = $(".results__container")
      let touchobj = e.changedTouches[0]
      let dist = parseInt(touchobj.clientY) - lastY
      lastY = touchobj.clientY;
      scrollOffset += dist;

      if (scrollOffset < 0) {
        scrollOffset = 0
        container.scrollTop(container.scrollTop() - dist)
      };

      if (scrollOffset > 250) {
        scrollOffset = 250
      };

      if (scrollOffset > container.scrollTop()) {
        console.log("uhoh")
        scrollOffset -= dist; //reverse changes
      }

      container.css("transform", `translateY(${scrollOffset}px)`)
    }
);

var lastScroll = 0;

$(".results__container").on("scroll", (e) => {
  let container = $(".results__container")
  let dist = lastScroll - container.scrollTop();
  lastScroll = container.scrollTop()

  if (scrollOffset > 0 && dist < 0) {
    //scroll using offset
    //this is kinda shaky, feel free to fix
    scrollOffset += dist;
    scrollOffset += dist;
    container.scrollTop(container.scrollTop() + dist);
    container.scrollTop(container.scrollTop() + dist);

    if (scrollOffset < 0) {
      scrollOffset = 0
    };

    if (scrollOffset > 250) {
      scrollOffset = 250
    };
  }

  if (scrollOffset > 0 && dist > 0) {
    if (scrollOffset > container.scrollTop()) {
      console.log("uhoh")
      scrollOffset -= dist; //reverse changes
    }
  }

  container.css("transform", `translateY(${scrollOffset}px)`)
})

var leaveTimeout

$("#search__results, .pill").on("mouseenter touchstart touchmove", function(){
  clearTimeout(leaveTimeout)
  $(".results__container").addClass("touchable")
})

$("#search__results, .pill").on("mouseleave touchend", function(){
  leaveTimeout = setTimeout(function(){
    $(".results__container").removeClass("touchable")
  }, 300)
})
