
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

$("#search__results, .pill").on("mouseenter touchstart", function(){
  $(".results__container").addClass("touchable")
})

$("#search__results, .pill").on("mouseout touchend", function(){
  setTimeout(function(){
  $(".results__container").removeClass("touchable")
  }, 100)
})
