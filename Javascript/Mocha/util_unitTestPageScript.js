$( document ).ready(function() {
    initPage();
});

function initPage(){
	$('.test h2').on('click',function( evt ){
		var el = evt.target;
		$(el).next('pre').toggle();
	});

  $('#mocha-stats .passes a').on('click',function(){
    $('#mocha-report').removeClass('fail').toggleClass('pass');
  });
  $('#mocha-stats .failures a').on('click',function(){
    $('#mocha-report').removeClass('pass').toggleClass('fail');
  });

}