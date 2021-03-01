
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

$(".pill").on(
    'scroll',
    (click) => {
      console.log(event)
    }
);

var leaveTimeout

$("#search__results, .pill").on("mouseenter touchstart", function(){
  clearTimeout(leaveTimeout)
  $(".results__container").addClass("touchable")
  console.log("in")
})

$("#search__results, .pill").on("mouseleave touchend", function(){
  console.log("mouse left");
  leaveTimeout = setTimeout(function(){
    $(".results__container").removeClass("touchable")
    console.log("out")
  }, 300)
})
