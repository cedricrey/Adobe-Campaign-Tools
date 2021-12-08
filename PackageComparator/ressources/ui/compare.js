var environments;
var UIsocket = io();
    UIsocket.on('connectionsList', connectionsList )
            .on('packageComparaison', packageComparaisonResponse )
            .on('packageReult', searchPackageResponse )

        //.on('connectionDetails', displayConnectionDetails);


function connectionsList( data ){        
  console.log('connectionsList');
  $('#connectionsList').empty();
  environments = data;
  data.forEach( (connection) => {
    var liConnection = $("<div id='env_"+connection+"' class='envSelector'><input type='checkbox' name='selectedEnv' value='" + connection + "' id='selectedEnv_"+connection+"' class='envEnabler'><label for='selectedEnv_"+connection+"'>" + connection + "</label><input type='radio' name='OriginEnv' value='" + connection + "' id='OriginEnv_"+connection+"'  class='envOrigin'><br/></div>");            
    $('#connectionsList').append(liConnection);
    //liConnection.on('click',getConnectionDetails)
  });
  $('#connectionsList').on('change',function(){
    $('.envSelector').each( (env) => {
      checked = $('.envEnabler', $('.envSelector')[env]).prop( "checked" );
      $('.envOrigin', $('.envSelector')[env]).attr('disabled', !checked);
      if(!checked)
        $('.envOrigin', $('.envSelector')[env]).prop('checked', false);
    });
  });
  $('.envSelector').each( (env) => {
      checked = $('.envEnabler', $('.envSelector')[env]).prop( "checked", true );
    });
}
UIsocket.emit('listConnections');

$('#specDefForm').on('submit', requestCompare);
$('#searchPackageButton').on('click', searchPackage);
                  //.on('change', SpecDefFormCHange)
                 
                 /*
function SpecDefFormCHange(){
  if($('#directSpec').prop( "checked" ))
  {
    $('#serverSpecNameDiv').hide();
    $('#directSpecDiv').show();            
  }
  else
  {
    $('#serverSpecNameDiv').show();
    $('#directSpecDiv').hide();
  }
};*/

function searchPackage( event ){
  if(!$('.envOrigin:checked').val())
  {
    alert("Merci de selectionner un envirronement d'origine")
    return;
  }
  UIsocket.emit('searchPackage',{ spec : $('#serverSpecName').val(), environment :  $('.envOrigin:checked').val()});
  event.preventDefault();
  return false;
};

function requestCompare( event ){
  $('#comparaison').empty();
   var selectedEnvs = [];
   $('.envEnabler:checked').each(function() {
     selectedEnvs.push($(this).val());
   });
  UIsocket.emit('requestCompare',{ environments : selectedEnvs, spec : $('#directSpecDefinition').val(), origin :  $('.envOrigin:checked').val()});
  event.preventDefault();
  return false;
}
//SpecDefFormCHange();


function packageComparaisonResponse( data ){
  $('#comparaison').empty();
  /*data.forEach((table)=>{
    $('#comparaison').append(table);
  });*/
  console.log('data ? ' , data );
  if( isEmpty(data.HTMLcomparaison) )
    $('#comparaison').html("<h1>Aucune différence</h1>")
  for(var schema in data.HTMLcomparaison ){
    $('#comparaison').append(`<h1>${schema}</h1>`);
    $('#comparaison').append(data.HTMLcomparaison[schema]);
  }
    environments = data.environments;
    initEnvCompare();

}

function searchPackageResponse( data ){
    console.log('searchPackageResponse :', data);
    $('#directSpecDefinition').val(data);          
}
function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function initEnvCompare(){
  $('#toolsForm').empty();
  var label = document.createElement('label');
  label.innerText = "Selectionner un environment pour comparer les textes avec " + environments[0] + " ";
  document.getElementById('toolsForm').appendChild(label);

  var select = document.createElement('select');
  select.setAttribute('name','txtCompareEnv')
  select.setAttribute('id','txtCompareEnvSelector')
  environments.forEach( (env) => {
    var option = document.createElement('option');
    option.setAttribute('value',env);
    option.innerText = env;
    select.appendChild(option)
  });
  select.options[0].innerText = " --- ";
  document.getElementById('toolsForm').appendChild(select);
  select.addEventListener("change", () => {selectTextCompareEnvironment() });
}

function selectTextCompareEnvironment( ){
  var selectedEnv = document.querySelector('#txtCompareEnvSelector').value;

  var allText = document.querySelectorAll(`.compareText`);
  allText.forEach( (currText) => {
    currText.style.display = "none";    
  });

  var allSelectedText = document.querySelectorAll(`.compareText_${selectedEnv}`);
  allSelectedText.forEach( (currText) => {
    var currId = currText.getAttribute('id');
    currText.style.display = "block";
    document.querySelector(`#${currId.replace('rhs','lhs')}`).style.display = "block";
  });
}