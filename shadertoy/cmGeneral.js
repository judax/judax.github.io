window.requestAnimFrame = (
  function()
  {
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function( callback ){ window.setTimeout(callback, 1000 / 60); };
  }
)();

window.URL = window.URL || window.webkitURL;

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

createGlContext = function ( cv )
{
    var gGLContext = null;
    var names = [ "webgl", "experimental-webgl", "webkit-3d", "moz-webgl" ];
    for( var i = 0; i<names.length; i++)
    {
        try
        {
            gGLContext = cv.getContext( names[i], {alpha: false, depth: false, antialias: false, stencil: true, premultipliedAlpha: false } );
        }
        catch( e )
        {
           gGLContext = null;
        }
        if( gGLContext )
             break;
    }

    return gGLContext;
}

createHttpReques = function()
{

	var xmlHttp = null;
	try
	{
		// Opera 8.0+, Firefox, Safari
		xmlHttp = new XMLHttpRequest();
	}
    catch (e)
    {
		// Internet Explorer Browsers
		try
		{
		  xmlHttp = new ActiveXObject("Msxml2.XMLHTTP");
		}
		catch (e) 
		{
			try
			{
		    	xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
		    }
		    catch (e)
		    {
		    	// Something went wrong
		    	alert("Your browser broke!");
		    }
		}
	}

    return xmlHttp;
}

getTime = function ( timestamp )
{
    var monthstr=new Array();
    monthstr[0]="Jan";
    monthstr[1]="Feb";
    monthstr[2]="Mar";
    monthstr[3]="Apr";
    monthstr[4]="May";
    monthstr[5]="Jun";
    monthstr[6]="Jul";
    monthstr[7]="Aug";
    monthstr[8]="Sep";
    monthstr[9]="Oct";
    monthstr[10]="Nov";
    monthstr[11]="Dec";

 	var a = new Date(timestamp*1000);

//    var month = a.getMonth() + 1;
//    var time = a.getDate() + "/" + month + "/" + a.getFullYear();

    var time = a.getFullYear() + "-" + monthstr[a.getMonth()] + "-" + a.getDate();

    return time;
}

function getSourceElement( e )
{
    var ele = null;
    if( e.target )     ele = e.target;
    if( e.srcElement ) ele = e.srcElement;
    return ele;
}

function setWheelEvent( myHandler )
{

  function wheel(event)
  {
  	var delta = 0;
  	if( !event ) event = window.event;
  	if( event.wheelDelta )
      {
  		delta = event.wheelDelta/120;
  	}
      else if( event.detail )
      {
  		delta = -event.detail/3;
  	}
  	if( delta )
  		myHandler( delta );
      if( event.preventDefault )
          event.preventDefault();
      event.returnValue = false;
  }

if (window.addEventListener) window.addEventListener('DOMMouseScroll', wheel, false);
window.onmousewheel = document.onmousewheel = wheel;

}


function getCoords( obj )
{
    var x = y = 0; 
    do
    {
         x += obj.offsetLeft;
         y += obj.offsetTop;
    }while( obj = obj.offsetParent );

    return { mX:x, mY:y };
}


function createNoWebGLMessage( base, old )
{
      var div = document.createElement("div");
      div.style.left   = "0px";
      div.style.top    = "0px";
      div.style.width  = "100%";
      div.style.height = "100%";
      div.style.padding= "0px";
      div.style.margin = "0px";
      div.style.position="absolute";
      div.style.backgroundColor = "#202020";
      div.style.borderRadius = "8px";
      div.style.cursor = "pointer";
      div.style.visibilty = "hidden";
      base.replaceChild( div, old );

      var divText = document.createElement("div");
      divText.style.width  = "86%";
      divText.style.height = "90%";
      divText.style.paddingLeft="7%";
      divText.style.paddingRight="7%";
      divText.style.paddingTop = "10%";
      divText.style.paddingBottom="0px";
      divText.style.color = "#ffffff";
      var fontSize = (base.offsetWidth/32) | 0;
      if( fontSize< 6 ) fontSize =  6;
      if( fontSize>16 ) fontSize = 16;
      divText.style.font="italic bold " + fontSize + "px arial,serif";
      divText.innerHTML = 'Shadertoy needs a WebGL-enabled browser. So far we know it works with:<ul><li>Firefox 17</li><li>Chrome 23</li><li>Internet Explorer 11</li><li>Safari 6 (instructions to enable WebGL <a style="color:#ff8020;" href="http://onvert.com/guides/enable-webgl-safari/">here<a>)</li></ul>';
      div.appendChild( divText );
}

function makeShort( str, maxLength )
{
    if( str.length<=maxLength ) return str;
    return str.substr( 0, maxLength-3 ) + "...";
}
