let results = $("#search__results")

function loop() {

  if (window.innerWidth < 1000) {

    scrollOffset = results.scrollTop();

    scrollOffset = 400 - scrollOffset

    if (scrollOffset < 0) scrollOffset = 0;

    results.css("transform", `translateY(${scrollOffset/10}vh)`)
  } else {
    results.css("transform", 'none')
  }

  requestAnimationFrame(loop);
}

loop();
