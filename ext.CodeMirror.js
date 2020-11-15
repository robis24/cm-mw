var dv = "";
( function () {
	var useCodeMirror, codeMirror, api, originHooksTextarea, cmTextSelection,
	$textbox1,
	enableContentEditable = true,
	// Keep these modules in sync with CodeMirrorHooks.php
	codeMirrorCoreModules = [
		'ext.CodeMirror.lib',
		'ext.CodeMirror.mode.mediawiki'
	];

	// Exit if WikiEditor is disabled
	// usebetatoolbar can be the string "0" if the user disabled the preference - Bug T54542#555387
	//if ( !( mw.loader.getState( 'ext.wikiEditor' ) && mw.user.options.get( 'usebetatoolbar' ) > 0 ) ) {
	//		return;
	//}

	useCodeMirror = mw.user.options.get( 'usecodemirror' ) > 0;
	api = new mw.Api();

	originHooksTextarea = $.valHooks.textarea;
	// define jQuery hook for searching and replacing text using JS if CodeMirror is enabled, see Bug: T108711
	$.valHooks.textarea = {
		get: function ( elem ) {
			if ( elem.id === 'wpTextbox1' && codeMirror ) {
				return codeMirror.doc.getValue();
			} else if ( originHooksTextarea ) {
				return originHooksTextarea.get( elem );
			}
			return elem.value;
		},
		set: function ( elem, value ) {
			if ( elem.id === 'wpTextbox1' && codeMirror ) {
				return codeMirror.doc.setValue( value );
			} else if ( originHooksTextarea ) {
				return originHooksTextarea.set( elem, value );
			}
			elem.value = value;
		}
	};

	// Disable spellchecking for Firefox users on non-Mac systems (Bug T95104)
	if ( navigator.userAgent.indexOf( 'Firefox' ) > -1 &&
	navigator.userAgent.indexOf( 'Mac' ) === -1
) {
	enableContentEditable = false;
}

// jQuery.textSelection overrides for CodeMirror.
// See jQuery.textSelection.js for method documentation
cmTextSelection = {
	getContents: function () {
		return codeMirror.doc.getValue();
	},
	setContents: function ( content ) {
		codeMirror.doc.setValue( content );
		return this;
	},
	getSelection: function () {
		return codeMirror.doc.getSelection();
	},
	setSelection: function ( options ) {
		codeMirror.focus();
		codeMirror.doc.setSelection( codeMirror.doc.posFromIndex( options.start ), codeMirror.doc.posFromIndex( options.end ) );
		return this;
	},
	replaceSelection: function ( value ) {
		codeMirror.doc.replaceSelection( value );
		return this;
	},
	getCaretPosition: function ( options ) {
		var caretPos = codeMirror.doc.indexFromPos( codeMirror.doc.getCursor( true ) ),
		endPos = codeMirror.doc.indexFromPos( codeMirror.doc.getCursor( false ) );
		if ( options.startAndEnd ) {
			return [ caretPos, endPos ];
		}
		return caretPos;
	},
	scrollToCaretPosition: function () {
		codeMirror.scrollIntoView( null );
		return this;
	}
};

/**
* Save CodeMirror enabled pref.
*
* @param {boolean} prefValue True, if CodeMirror should be enabled by default, otherwise false.
*/
function setCodeEditorPreference( prefValue ) {
	useCodeMirror = prefValue; // Save state for function updateToolbarButton()

	if ( mw.user.isAnon() ) { // Skip it for anon users
		return;
	}
	api.saveOption( 'usecodemirror', prefValue ? 1 : 0 );
	mw.user.options.set( 'usecodemirror', prefValue ? 1 : 0 );
}

var rivdate = "";
var rivcontent = "";
/**
* Replaces the default textarea with CodeMirror
*/
function enableCodeMirror() {
	var config = mw.config.get( 'extCodeMirrorConfig' );

	mw.loader.using( codeMirrorCoreModules.concat( config.pluginModules ), function () {
		var $codeMirror,
		selectionStart = $textbox1.prop( 'selectionStart' ),
		selectionEnd = $textbox1.prop( 'selectionEnd' ),
		scrollTop = $textbox1.scrollTop();

		// If CodeMirror is already loaded or wikEd gadget is enabled, abort. See T178348.
		// FIXME: Would be good to replace the wikEd check with something more generic.
		if ( codeMirror || mw.user.options.get( 'gadget-wikEd' ) > 0 ) {
			return;
		}

		// T174055: Do not redefine the browser history navigation keys (T175378: for PC only)
		CodeMirror.keyMap.pcDefault[ 'Alt-Left' ] = false;
		CodeMirror.keyMap.pcDefault[ 'Alt-Right' ] = false;


    var cmsettingstheme = 'material-palenight';

		console.log(check_cookie_name('cmtheme'), 'no' );

		function check_cookie_name(name)
     {
       var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
       if (match) {
        // console.log(match[2]);
				 return match[2];
       }
       else{
            console.log('--something went wrong---');
       }
    }

		if(check_cookie_name('cmtheme')){
			cmsettingstheme = check_cookie_name('cmtheme');
		}




		codeMirror = CodeMirror.fromTextArea( $textbox1[ 0 ], {
			lineNumbers: true, matchBrackets: true, matchTags: true, 'lineWrapping': true, mode: 'htmlmixed', theme: cmsettingstheme, extraKeys: {
				"F11": function(cm) {
					cm.setOption("fullScreen", !cm.getOption("fullScreen"));
				},
				"Esc": function(cm) {
					if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
				} }
			} );
			$codeMirror = $( codeMirror.getWrapperElement() );

			// Allow textSelection() functions to work with CodeMirror editing field.
			$codeMirror.textSelection( 'register', cmTextSelection );
			// Also override textSelection() functions for the "real" hidden textarea to route to
			// CodeMirror. We unregister this when switching to normal textarea mode.
			$textbox1.textSelection( 'register', cmTextSelection );

			$codeMirror.resizable( {
				handles: 'se',
				resize: function ( event, ui ) {
					ui.size.width = ui.originalSize.width;
				}
			} );

			codeMirror.doc.setSelection( codeMirror.doc.posFromIndex( selectionEnd ), codeMirror.doc.posFromIndex( selectionStart ) );
			codeMirror.scrollTo( null, scrollTop );

			// HACK: <textarea> font size varies by browser (chrome/FF/IE)
			$codeMirror.css( {
				'font-size': $textbox1.css( 'font-size' ),
				'line-height': $textbox1.css( 'line-height' )
			} );

			// use direction and language of the original textbox
			$codeMirror.attr( {
				dir: $textbox1.attr( 'dir' ),
				lang: $textbox1.attr( 'lang' )
			} );

			// T194102: UniversalLanguageSelector integration is buggy, disabling it completely
			$( codeMirror.getInputField() ).addClass( 'noime' );

			// set the height of the textarea
			codeMirror.setSize( null, $textbox1.height() );

			var snipkeys = [
{text:"arraydefine:$array__ |   |,}}", displayText:'arraydefine'},
{text:"arraymap:$array__ |@@@|\n\n|}}", displayText:'arraymap'},
{text:"arrayprint:$array__ |,}}", displayText:'arrayprint'},
{text:"arraysize:$array__ }}", displayText:'arraysize'},
{text:"caprint:$array__ | |noparse}}", displayText:'caprint'},
{text:"casize:$array__ }}", displayText:'casize'},
{text:"camap:$array__|@@@|\n\n||}}", displayText:'camap'},
{text:"camapt:$array__ |template}}", displayText:'camapt'},
{text:"cadefine:$array__ |wson-array|delimiter|}}", displayText:'cadefine'},
{text:"cadepush:$array__| }}", displayText:'cadepush'},
{text:"if:\n  |\n  |\n}}", displayText:'if'},
{text:"ifeq:   |\n  |\n  |\n}}", displayText:'ifeq'},
{text:"explode:string|delimiter|position|limit}}", displayText:'explode'},
{text:"expr: }}", displayText:'expr'},
{text:"loop:varname\n  |0\n  |4\n  |{{#var: varname }}\n}}", displayText:'loop'},
{text:"vardefine: i | 0 }}{{#while:\n  |{{#ifexpr: {{#var: i }} < 5 | true }}\n  |{{#var: i }}{{#vardefine: i | {{#expr: {{#var: i }} + 1 }} }}\n}}", displayText:'while'},
{text:"time:d-m-Y| now |nl}}", displayText:'time'},
{text:"switch:\n  |\n  |\n  |\n  |#default =\n}}", displayText:'switch'},
{text:"ifexpr:\n  |\n  |\n}}", displayText:'ifexpr'},
{text:"replace:string|search term|replacement term}}", displayText:'replace'},
{text:"sub:string|start|length}}", displayText:'sub'},
{text:"urldecode:{{#urlget: key }} }}", displayText:'urlget'},
{text:"wsform|\n  {{#wscreate||mwwrite=pagetitle|mwtemplate=Template|mwfollow=mwfollow}}\n  {{#wsfield||type=text|name=Text|value=|placeholder=text|class=form-field}}\n  {{#wsfield||type=submit|value=save|class=btn}}\n|action=addToWiki}}", displayText:'wsform'},

 ]

			//auto snippets
      var prevch = 0;
			codeMirror.on('inputRead', function onChange(editor, input) {
			if(prevch < 2){
				if(input.text == '{'){
					prevch++;
				}else{
					prevch = 0;
				}
		}else{
				if(input.text == '#'){
					console.log(input)
				//	completeAfter(codeMirror)
				var options = {
    hint: function() {
       return {
         from: editor.getDoc().getCursor(),
          to: editor.getDoc().getCursor(),
        list: snipkeys
      }
    }
  };
   editor.showHint(options);
	 var completion = editor.state.completionActive.data;
 CodeMirror.on(completion, 'select', function(completion, element) {

		 console.log(completion);
 })
					prevch = 0;
				}
		}
			});

var addsnip = function(){
	console.log('hoi')


}



			document.querySelector('.CodeMirror').addEventListener('contextmenu', go, false)
			var numPanels = 0;
			var panels = {};
			editor = codeMirror;
			function makePanel(where) {
				var node = document.createElement("div");
				var id = ++numPanels;
				var hidebar, widget, close, label, fullscreen, comment, save, wrap, info, infobox, theme, live, managed, nav;

				node.id = "panel-" + id;
				node.className = "panel " + where;


				var codemirrorCss11 = document.createElement('link');
				codemirrorCss11.setAttribute('href','https://fonts.googleapis.com/icon?family=Material+Icons');
				codemirrorCss11.setAttribute('rel','stylesheet');
				document.head.appendChild(codemirrorCss11);

				var diffscript = document.createElement('script');
				diffscript.setAttribute('src','https://cdnjs.cloudflare.com/ajax/libs/diff_match_patch/20121119/diff_match_patch.js');
				document.head.appendChild(diffscript);

        hidebar = node.appendChild(document.createElement("a"));
				hidebar.setAttribute("title", "toggle toolbar");
				hidebar.setAttribute("class", "toggle-toolbar-button material-icons");
				hidebar.textContent = "keyboard_arrow_right";
				CodeMirror.on(hidebar, "mousedown", function(e) {
					e.preventDefault();
           node.classList.toggle('close');

				})

				live = node.appendChild(document.createElement("a"));
				live.setAttribute("title", "live");
				live.setAttribute("class", "live-button material-icons");
				live.textContent = "visibility";
				CodeMirror.on(live, "mousedown", function(e) {
					e.preventDefault();
                    if(live.classList.contains('cm-panel-active')){
                      live.classList.remove('cm-panel-active');
                      $('body')[0].classList.remove('cm-live-mode');
					  $('body.action-submit textarea, body.action-edit textarea').off("change keyup paste");
					  $('.CodeMirror-fullscreen').attr('style','');
                      $('#wikiPreview').attr('style','');
				    }else{
				      $('body')[0].classList.add('cm-live-mode');
					  live.classList.add('cm-panel-active');
					  liveMode();
					}
				});




var params = {
		action: 'query',
		prop: 'revisions',
		titles: mw.config.values.wgPageName,
		rvprop: 'timestamp|user|comment|content',
		rvslots: 'main',
		formatversion: '2',
		format: 'json'
	},
	api = new mw.Api();

api.get( params ).done( function ( data ) {
	var pages = data.query.pages,
		p;
	for ( p in pages ) {
var rivdate1 = pages[ p ].revisions
if(rivdate1){
  rivdate = rivdate1[0].timestamp
  rivcontent = rivdate1[0].content
}
	}
} );







				var hdl = document.createElement('div');
hdl.classList.add('handle');
hdl.setAttribute('draggable','true');
document.body.appendChild(hdl);

hdl.addEventListener('drag', function(e){
hdl.classList.add('hidden')
hdl.classList.add('d-none')

if(hdl.classList.contains('ltr')){
  var ht = 100 / window.innerWidth * e.clientX;
console.log(100 / window.innerWidth * e.clientX)
  $('.CodeMirror-fullscreen').attr('style','width:unset !important;height:100vh !important;left:'+ht+'vw;right:0')
$('#wikiPreview').attr('style','width:'+ ht+'vw !important;left:0;height:100vh;');

}else{
var ht = 100 / window.innerHeight * e.clientY;
console.log(100 / window.innerHeight * e.clientY)
  $('.CodeMirror-fullscreen').attr('style','height:'+(100 - ht)+'vh !important')
$('#wikiPreview').attr('style','height:'+ ht+'vh !important');
}
})


hdl.addEventListener('dragend', function(e){
hdl.classList.remove('hidden');
hdl.classList.remove('d-none')
if(hdl.classList.contains('ltr')){
  var ht = 100 / window.innerWidth * e.clientX;
console.log(100 / window.innerWidth * e.clientX)
  $('.CodeMirror-fullscreen').attr('style','width:unset !important;height:100vh !important;left:'+ht+'vw;right:0')
$('#wikiPreview').attr('style','width:'+ ht+'vw !important;left:0;height:100vh;');
hdl.setAttribute('style','height:100vh;width:5px;top:0;left:'+ht+'vw')
}else{
   var ht = 100 / window.innerHeight * e.clientY;
console.log(100 / window.innerHeight * e.clientY)
  $('.CodeMirror-fullscreen').attr('style','height:'+(100 - ht)+'vh !important')
$('#wikiPreview').attr('style','height:'+ ht+'vh !important');
hdl.setAttribute('style','top:'+ht+'vh')
}
})


hdl.addEventListener('click', function(e){

   if(hdl.classList.contains('ltr')){
      hdl.classList.remove('ltr');
      hdl.setAttribute('style', '');
      $('.CodeMirror-fullscreen').attr('style','')
    $('#wikiPreview').attr('style','');
  }else{
  	hdl.classList.add('ltr');
  	hdl.setAttribute('style', 'height:100vh;width:5px;top:0;left:50vw;');
  	$('.CodeMirror-fullscreen').attr('style','height:100vh !important;width:50vw;left:50vw')
    $('#wikiPreview').attr('style','height:100vh !important;width:50vw;left:0');
  }


})


				save = node.appendChild(document.createElement("a"));
				save.setAttribute("title", "save ctrl+s");
				save.setAttribute("class", "save-button material-icons cm-panel-active");
				save.textContent = "save";
				CodeMirror.on(save, "mousedown", function(e) {
					e.preventDefault();
                    ajaxSave(editor);
					//panels[node.id].clear();
				});
				fullscreen = node.appendChild(document.createElement("a"));
				fullscreen.setAttribute("title", "fullscreen F11");
				fullscreen.setAttribute("class", "fullscreen-button material-icons ");
				fullscreen.textContent = "fullscreen";
				CodeMirror.on(fullscreen, "mousedown", function(e) {
					e.preventDefault();
                    if(fullscreen.classList.contains('cm-panel-active')){
                      fullscreen.classList.remove('cm-panel-active');
                      editor.setOption("fullScreen", false);
                        $('.CodeMirror-fullscreen').attr('style','');
                        $('#wikiPreview').attr('style','');
												fullscreen.textContent = "fullscreen";
                    }else{
					  editor.setOption("fullScreen", true);
                      fullscreen.classList.add('cm-panel-active');
                      fullscreen.textContent = "fullscreen_exit";
                    }
					//panels[node.id].clear();
				});
				comment = node.appendChild(document.createElement("a"));
				comment.setAttribute("title", "comment shift + enter");
				comment.setAttribute("class", "comment-button material-icons ");
				comment.textContent = "code";
				CodeMirror.on(comment, "mousedown", function(e) {
					e.preventDefault();

					//function insertTextAtCursor(editor, text) {
					var doc = editor.getDoc();
					var cursor = doc.getCursor();
					var selection = doc.getSelection();

                     commentOut(doc, editor, cursor, selection)



					// editor.setOption("fullScreen", true)

					//panels[node.id].clear();
				});

				wrap = node.appendChild(document.createElement("a"));
				wrap.setAttribute("title", "line-wrap");
				wrap.setAttribute("class", "linewrap-button material-icons");
				wrap.textContent = "short_text";
				CodeMirror.on(wrap, "mousedown", function(e) {
					e.preventDefault();
					if(editor.getOption("lineWrapping") === true){
				       	editor.setOption("lineWrapping", false);
				       	wrap.classList.remove('cm-panel-active');
								$('.linewarp-button').text('short_text')
					}else{
							editor.setOption("lineWrapping", true);
							$('.linewarp-button').text('drag_handle');
							wrap.classList.add('cm-panel-active');
					}


				});


				managed = node.appendChild(document.createElement("a"));
				managed.setAttribute("title", "make-managed");
				managed.setAttribute("class", "make-managed-button material-icons");
				managed.textContent = "assignment_turned_in";
				CodeMirror.on(managed, "mousedown", function(e) {
					e.preventDefault();
					makeManaged()


       });


				info = node.appendChild(document.createElement("a"));
				info.setAttribute("title", "info");
				info.setAttribute("class", "info-button material-icons");
				info.textContent = "info";
				CodeMirror.on(info, "mousedown", function(e) {
					e.preventDefault();
					if($(".info-box").length){
						$(".info-box").remove();
						info.classList.remove('cm-panel-active');
					}else{
				    info.classList.add('cm-panel-active');
					infobox = node.appendChild(document.createElement("div"));
					infobox.setAttribute("class", "info-box");
					infobox.setAttribute("style","background:white");
					infobox.innerHTML = "Fullscreen <code>F11<br></code>"+
					                     "Exit fullscreen  <code>F11 or ESC</code><br></code>"+
					                      "Insert comment  <code>SHIFT + ENTER<br></code>"+
																"Find  <code>CTRL + F<br></code>"+
																"Find next  <code>CTRL + G<br></code>"+
																"Find prev  <code>CTRL + SHIFT + G</code><br>"+
																"Replace  <code>CTRL + SHIFT + F</code><br>"+
																"Replace all <code>CTRL + SHIFT + R</code><br>"+
																"Save <code>CTRL + S</code><br>"+
																"Multi cursor <code>CTRL + CLICK</code><br>"+
																"Vertical select <code>ALT + CLICK + DRAG</code><br>"+
																"Open template or widget <code>RIGHTCLICK <strike>firefox</strike></code><br>"+



																"";
          }

				});

				var themes = ["3024-day", "3024-night", "abcdef", "ambiance", "ambiance-mobile", "ayu-dark", "ayu-mirage", "base16-dark", "base16-light", "bespin", "blackboard", "cobalt", "codemirror", "colorforth", "darcula", "dracula", "duotone-dark", "duotone-light", "eclipse", "elegant", "erlang-dark", "gruvbox-dark", "hopscotch", "icecoder", "idea", "isotope", "lesser-dark", "liquibyte", "lucario", "material", "material-darker", "material-ocean", "material-palenight", "mbo", "mdn-like", "midnight", "monokai", "moxer", "neat", "neo", "night", "nord", "oceanic-next", "panda-syntax", "paraiso-dark", "paraiso-light", "pastel-on-dark", "railscasts", "rubyblue", "seti", "shadowfox", "solarized", "ssms", "the-matrix", "tomorrow-night-bright", "tomorrow-night-eighties", "ttcn", "twilight", "vibrant-ink", "xq-dark", "xq-light", "yeti", "yonce", "zenbur", "default"]

				theme = node.appendChild(document.createElement("a"));
				theme.setAttribute("title", "theme");
				theme.setAttribute("class", "theme-button material-icons");
				theme.textContent = "palette";
				CodeMirror.on(theme, "mousedown", function(e) {
					e.preventDefault();

        var thindex = themes.indexOf(editor.getOption("theme"));
				console.log(thindex);
        if(themes.length - 1 == thindex){
					document.cookie = "cmtheme="+themes[0];
					editor.setOption("theme", themes[0]);
					mw.notify( themes[0] );
				}else{
					document.cookie = "cmtheme="+themes[thindex + 1];
						editor.setOption("theme", themes[thindex + 1]);
						mw.notify( themes[thindex + 1] );
				}

				});

				nav = node.appendChild(document.createElement("a"));
				nav.setAttribute("title", "nav-button");
				nav.setAttribute("class", "nav-codemirror material-icons");
				nav.setAttribute("style", "transform:scaleX(-1)");
				nav.textContent = "view_sidebar";
				CodeMirror.on(nav, "mousedown", function(e) {
					e.preventDefault();
					var wrapper = node.parentNode;
					if(!wrapper.classList.contains('wrapper-navbar-codemirror')){
						var navbar = document.createElement("div");
						navbar.setAttribute("class", "navbar-codemirror");

						var params = {
								 action: 'ask',
								 query: '[[Template:+||Widget:+]]|?Modification date|sort=Modification date|limit=999|order=desc',
								 format: 'json'
								},
								api = new mw.Api();//need to add fail function

								api.postWithToken( 'csrf', params ).done( function ( data ) {
                var cl = "";var zcl = "";
								if(mw.config.values.wgPageName == "MediaWiki:Common.css"){
									zcl = "selected";
								}
								if(mw.config.values.wgPageName == "MediaWiki:Common.js"){
									cl = "selected";
								}
								 console.log(data.query.results)
								 var linktree = '<div class="'+cl+'" onclick=\'openTemplateCM(this, "MediaWiki:Common.js", "'+mw.config.values.wgServer+mw.config.values.wgScript+'/MediaWiki:Common.js?action=edit")\'><span class="material-icons">source</span><span>Common.js</span></div><div class="'+zcl+'" onclick=\'openTemplateCM(this, "MediaWiki:Common.css", "'+mw.config.values.wgServer+mw.config.values.wgScript+'/MediaWiki:Common.css?action=edit")\'><span class="material-icons">web</span><span>Common.css</span></div><hr>';


								 var ccount = 0;
								 for (var [key, value] of Object.entries(data.query.results)){
									 var claz = "";
									 if(mw.config.values.wgPageName == key){
										 claz = "selected";
									 }
                  var sp = key.split(':');
                  var ns = sp[0];


									if(ns == "Widget"){
										var icn = "insert_comment";
										var ex = ".w"
									}else{
										var icn = "text_snippet";
										var ex = ".t";
									}

									var tst = sp[1] + ex;

									 linktree += '<div class="'+claz+'" onclick="openTemplateCM(this, \''+key+'\', \''+value.fullurl+'?action=edit\')"><span class="material-icons">'+icn+'</span><span>'+tst+'</span></div>'
								 }
								 navbar.innerHTML = linktree
								 wrapper.setAttribute("class", "wrapper-navbar-codemirror grid");
									wrapper.appendChild(navbar)
                //     $('.CodeMirror-fullscreen').removeClass('CodeMirror-fullscreen');
                //  wrapper.classList.add('CodeMirror-fullscreen')
								})





					}else{
						document.querySelector('.navbar-codemirror').classList.toggle('hide');
						wrapper.classList.toggle('grid');
					}


				});


				close = node.appendChild(document.createElement("a"));
				close.setAttribute("title", "remove codemirror");
				close.setAttribute("class", "remove-codemirror material-icons float-right");
				close.textContent = "close";
				CodeMirror.on(close, "mousedown", function(e) {
					e.preventDefault();
					panels[node.id].clear();
					editor.toTextArea();

				});

				label = node.appendChild(document.createElement("span"));
				//label.textContent = "I'm panel n°" + id;
				return node;
			}
			function addPanel(where) {
				var node = makePanel(where);
				panels[node.id] = editor.addPanel(node, {position: where, stable: true});
			}

			addPanel("top");


			function go(e){
				if(e.target.classList.contains('cm-ww')){

					e.preventDefault();
				openInNewTab(window.location.pathname+'?title=template:'+e.target.innerText+'&action=edit')
			// var iframe = document.createElement('iframe');
			// iframe.setAttribute('src', window.location.pathname+'?title=template:'+e.target.innerText+'&action=edit');
			// document.querySelector('body').appendChild(iframe);
				}else if(e.target.classList.contains('cm-wt')){
					e.preventDefault();
					openInNewTab(window.location.pathname+'?title=widget:'+e.target.innerText+'&action=edit')
				}
  	if(e.target.classList.contains('cm-string')){
			e.preventDefault();
			var classes = e.target.innerText.replace(/"/g, '').split(' ');

			var params = {
				action: 'query',
				prop: 'revisions',
				titles: 'MediaWiki:Common.css',
				rvprop: 'timestamp|user|comment|content',
				rvslots: 'main',
				formatversion: '2',
				format: 'json'
			},
			api = new mw.Api();

			api.get( params ).done( function ( data ) {
				var linenr = 0;
				var pages = data.query.pages;
					var csstext = pages[0].revisions[0].content;
					console.log(csstext);
          var mss = [];
					classes.forEach(function(item, i){
						var regex = new RegExp( '.'+item, 'gm' );
	          var m = csstext.match(regex);
						if(m){
							mss.push(m);
							console.log(m);
						}
						linenr = lineNumber('.'+item, csstext);

					})
						if(mss.length){


							// var mi = mss[0];
							//
							//
							// var lineNumber = 1;
							// for (var i = 0; i < mi.lenght; i++)
							// {
							// 		if (mi[i] == '\n') lineNumber++;
							// }



							var csspop = document.createElement('div');
							csspop.classList.add('csspop')
							csspop.innerHTML = '<a class="material-icons css-close" >close</a><a class="material-icons css-save" >save</a><textarea id="csspoptextarea" height="100%" width="100%">'+csstext+'</textarea>';
							$('#panel-1').after($(csspop));
							cssmirror = CodeMirror.fromTextArea( $('#csspoptextarea')[ 0 ], {
								lineNumbers: true, matchBrackets: true, matchTags: true, 'lineWrapping': true, mode: 'css', theme: "default", extraKeys: {
									"F11": function(cm) {
										cm.setOption("fullScreen", !cm.getOption("fullScreen"));
									},
									"Esc": function(cm) {
										if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
									},
									"Ctrl-S": function(cm) {
										saveCssCm(cm, $('#csspoptextarea')[ 0 ]);
									}
								 }
								});
								cssmirror.setSize(null, 100);


                //var doc = cssmirror.getDoc();
								cssmirror.markText({line: linenr -1 , ch: 1}, {line: linenr , ch: -1}, {className: "css-match"})
                 cssmirror.scrollIntoView({line: linenr + 3, ch: 1});
               csspop.querySelector('.css-close').addEventListener('click', function(){
								 cssmirror.toTextArea();
								 $('.csspop').remove();

							 })
							 csspop.querySelector('.css-save').addEventListener('click', function(){
								saveCssCm(cssmirror, $('#csspoptextarea')[ 0 ]);
							})
							//	saveCssCm(cssmirror, $('#csspoptextarea')[ 0 ])

      		}




 })
}
}

function lineNumber(needle,haystack){
return lineNumberByIndex(haystack.indexOf(needle),haystack);
}

function lineNumberByIndex(index,string){
    // RegExp
    var line = 0,
        match,
        re = /(^)[\S\s]/gm;
    while (match = re.exec(string)) {
        if(match.index > index)
            break;
        line++;
    }
    return line;
}

function saveCssCm(mirror, textar){

	mirror.save();
	var params = {
		action: 'edit',
		title: 'MediaWiki:Common.css',
		text: textar.value,
		format: 'json'
	},
	api = new mw.Api();

	api.postWithToken( 'csrf', params ).done( function ( html ) {

mirror.toTextArea();
$('.csspop').remove();
		mw.notify( 'CSS Saved' );
});

}




			function openInNewTab(url) {
				var win = window.open(url, '_blank');
				win.focus();
			}

			function ajaxSave(editor){

				var params = {
		action: 'query',
		prop: 'revisions',
		titles: mw.config.values.wgPageName,
		rvprop: 'timestamp|user|comment|content',
		rvslots: 'main',
		formatversion: '2',
		format: 'json'
	},
	api = new mw.Api();

api.get( params ).done( function ( data ) {
	var pages = data.query.pages,
		p;
	for ( p in pages ) {
var rivdate1 = pages[ p ].revisions
var rivdate2 = "";
if(rivdate1){
  rivdate2 = rivdate1[0].timestamp
}
console.log(rivdate2, rivdate)
if(rivdate2 === rivdate || $('#wikiPreview').hasClass('merged') ){
                $('#wikiPreview').removeClass('merged')
				editor.save();
                $('#panel-1 .save-button')[0].classList.add('cm-panel-active');
				var params = {
					action: 'edit',
					title: mw.config.values.wgPageName,
					text: $('#wpTextbox1').val(),
					format: 'json'
				},
				api = new mw.Api();

				api.postWithToken( 'csrf', params ).done( function ( html ) {

					$( window ).off( 'beforeunload' );
					mw.notify( 'Saved' );
					if($('body').hasClass('action-submit')){
						var parser = new DOMParser();
						var doc = parser.parseFromString(html, "text/html");
						var elem = doc.querySelectorAll('#bodyContent .mw-parser-output')[0];
						$('#wikiPreview .mw-parser-output').html(elem);
					}

				var params = {
		action: 'query',
		prop: 'revisions',
		titles: mw.config.values.wgPageName,
		rvprop: 'timestamp|user|comment|content',
		rvslots: 'main',
		formatversion: '2',
		format: 'json'
	},
	api = new mw.Api();

api.get( params ).done( function ( data ) {
	var pages = data.query.pages,
		p;
	for ( p in pages ) {
var rivdate1 = pages[ p ].revisions
rivdate = rivdate1[0].timestamp
console.log('new', rivdate)
	}
} );


				} );

              }else{

              	mergeMode(rivcontent, rivdate1[0].content);
             // 	alert('changed');

              }

	}
} );


			}

	$('body.action-edit, body.action-submit').keydown(function()  {
			 $('#panel-1 .save-button')[0].classList.remove('cm-panel-active');
				if (event.shiftKey === true && event.key === "Enter") {
					event.preventDefault();
					var doc = editor.getDoc();
					var cursor = doc.getCursor();
					var selection = doc.getSelection();
                    commentOut(doc, editor, cursor, selection);

				}
			});



			$('body.action-edit, body.action-submit').keydown(function()  {
				//var x = event.keyCode;
				if (event.ctrlKey === true && event.key === "s") {
					event.preventDefault();

					ajaxSave(editor);


				}else{
					mw.confirmCloseWindow();
					$('#wpSave, #wpPreview, #wpDiff').on('click', function(){
						$( window ).off( 'beforeunload' );
					})
				}

			})



			window.liveMode = function() {
				if($('#wikiPreview').length === 0){
					var previewDiv = $('<div id="wikiPreview"></div>');
					$('#panel-1').before(previewDiv);
				}
				$('#wikiPreview').attr('style','')
				var oldVal = "";
				$('body.action-submit textarea, body.action-edit textarea').on("change keyup paste", function() {
					var currentVal = $(this).val();
					if(currentVal == oldVal) {
						return; //check to prevent multiple simultaneous triggers
					}

					oldVal = currentVal;
					var text = encodeURIComponent($('textarea').val());

					$.ajax({
						url: '/api.php?action=parse&format=json&formatversion=2&title=New&text='+text+'&pst=&prop=text%7Cmodules%7Cjsconfigvars&preview=true&disableeditsection=true&uselang=en',
						dataType: 'json',
						success: function (x) {
							$('#wikiPreview').html(x.parse.text);
						}
					});
				});
			};
var openwindows = [];
window.openTemplateCM = function(link, key, url){
	console.log(key, openwindows.length)
var inarray = false;
openwindows.forEach(function(item, i){
	console.log(item.key,key)
if(item.key == key){
//	console.log('found')
	if(item.window.name){
	  item.window.focus();
		 inarray = true;
	}
}

})
if(inarray == false){
	console.log('no0000000')
		var ws = window.open(url, key);
		openwindows.push({key:key, window:ws});
	}
}


			$('body.action-edit #wpTextbox1, body.action-submit #wpTextbox1').keydown(function(event) {
				var x = event.keyCode;
				if (x == 13 ) {
					if(!event.shiftKey){
						var insert = document.execCommand('insertText', false, '<!-- \n -->');
						if(insert){
							event.preventDefault();
							$('#wpTextbox1').focus()
							insert
						}
					}
				}
			})








		} );
	}

	/**
	* Updates CodeMirror button on the toolbar according to the current state (on/off)
	*/
	function updateToolbarButton() {
		// eslint-disable-next-line no-jquery/no-global-selector
		var $button = $( '#mw-editbutton-codemirror' );

		$button.toggleClass( 'mw-editbutton-codemirror-active', !!useCodeMirror );

		// WikiEditor2010 OOUI ToggleButtonWidget
		if ( $button.data( 'setActive' ) ) {
			$button.data( 'setActive' )( !!useCodeMirror );
		}
	}

	/**
	* Enables or disables CodeMirror
	*/
	function switchCodeMirror() {
		var selectionObj, selectionStart, selectionEnd, scrollTop, hasFocus, $codeMirror;

		if ( codeMirror ) {
			scrollTop = codeMirror.getScrollInfo().top;
			selectionObj = codeMirror.doc.listSelections()[ 0 ];
			selectionStart = codeMirror.doc.indexFromPos( selectionObj.head );
			selectionEnd = codeMirror.doc.indexFromPos( selectionObj.anchor );
			hasFocus = codeMirror.hasFocus();
			$codeMirror = $( codeMirror.getWrapperElement() );
			setCodeEditorPreference( false );
			$codeMirror.textSelection( 'unregister' );
			$textbox1.textSelection( 'unregister' );
			codeMirror.toTextArea();
			codeMirror = null;
			if ( hasFocus ) {
				$textbox1.trigger( 'focus' );
			}
			$textbox1.prop( 'selectionStart', selectionStart );
			$textbox1.prop( 'selectionEnd', selectionEnd );
			$textbox1.scrollTop( scrollTop );
		} else {
			enableCodeMirror();
			setCodeEditorPreference( true );
		}
		updateToolbarButton();
	}

	/**
	* Adds the CodeMirror button to WikiEditor
	*/
	function makeManaged(){

		editor.save()

console.log('333')
		var regex = /{{{([\w\s]+)\|}}}/gm;
		var str = document.getElementById('wpTextbox1').value;
		var m;
		var z = [];
		var templateparams = "";
		while ((m = regex.exec(str)) !== null) {

				if (m.index === regex.lastIndex) {
						regex.lastIndex++;
				}

				m.forEach(function(match, groupIndex){
			if(groupIndex == 1){
				console.log(z.indexOf(match))
		if(z.indexOf(match) == -1){
				z.push(match);
				 templateparams +=  '|'+match+'=\n'
			}
			//  templateparams +=  '|'+match+'=\n'

			}
				});
		}


		var doc = editor.doc;


		var intemplate = '<noinclude>{{Managed\n'+
		'|Version=1.0\n'+
		'|Version notes=1.0 - First managed version\n'+
		'|Short description=\n'+
		'}}\n\n'+
		'This is the "'+mw.config.values.wgTitle+'" template. It should be called in the following format:\n\n'+
		'<pre>\n'+
		'{{'+mw.config.values.wgTitle+'\n'+
		templateparams+'}}\n'+
		'</pre>\n'+
		'</noinclude><includeonly>';


		var start = {
				line: 0,
				ch: 0
		}
		doc.replaceRange(intemplate, start);

		var outtemplate = '</includeonly>';

		var line = doc.getLine(doc.size - 1);


		var end = {
				line: doc.size,
				ch: line.length - 1
		}
		doc.replaceRange(outtemplate, end);



	}




	function commentOut(doc, editor, cursor, selection){

  	if(editor.display.view[cursor.line].line.stateAfter.localMode){
  		if(editor.display.view[cursor.line].line.stateAfter.localMode.name === "javascript"){
              commentJs(doc, selection, cursor)
  		}else if(editor.display.view[cursor.line].line.stateAfter.localMode.name === "css"){
              commentCss(doc, selection, cursor)
  		}else{
  			  commentWiki(doc, selection, cursor)
  		}
  	}else{
          commentWiki(doc, selection, cursor)
  	}
  }
function commentWiki(doc, selection, cursor){
 if(selection){
    var slmatch = selection.match(new RegExp('<!--'));
    if(slmatch){
	  var uncom = selection.replace('<!--','').replace('-->', '');
	  doc.replaceSelection(uncom , selection );
    }else{
      doc.replaceSelection('<!-- '+selection+' -->' , selection );
    }
 }else{
	doc.replaceRange('<!-- \n -->' , cursor);
 }
}

function commentCss(doc, selection, cursor){
 if(selection){
    var slmatch = selection.match(new RegExp(/\/\*/));
    if(slmatch){
	  var uncom = selection.replace(/\/\*/,'').replace(/\*\//, '');
	  doc.replaceSelection(uncom , selection );
    }else{
      doc.replaceSelection('/* '+selection+' */' , selection );
    }
 }else{
	doc.replaceRange('\n' , cursor);
 }
}


function commentJs(doc, selection, cursor){
	if(selection){
	   var slmatch = selection.match(new RegExp('//'));
	    if(slmatch){
		  var uncom = selection.replace('//','');
		  doc.replaceSelection(uncom , selection );
	    }else{
	      doc.replaceSelection('// '+selection , selection );
	    }
	 }else{
	 	doc.replaceRange('\n' , cursor);
	 }
}




	function addCodeMirrorToWikiEditor() {
		var $codeMirrorButton;

		$textbox1.wikiEditor(
			'addToToolbar',
			{
				section: 'main',
				groups: {
					codemirror: {
						tools: {
							CodeMirror: {
								label: mw.msg( 'codemirror-toggle-label' ),
								type: 'toggle',
								oouiIcon: 'highlight',
								action: {
									type: 'callback',
									execute: function () {
										switchCodeMirror();
									}
								}
							}
						}
					}
				}
			}
		);

		$codeMirrorButton = $textbox1.data( 'wikiEditor-context' ).modules.toolbar.$toolbar.find( '.tool[rel=CodeMirror]' );
		$codeMirrorButton
		.attr( 'id', 'mw-editbutton-codemirror' );

		if ( useCodeMirror ) {
			enableCodeMirror();
		}

		updateToolbarButton();
	}

	$( function () {
		// eslint-disable-next-line no-jquery/no-global-selector
		$textbox1 = $( '#wpTextbox1' );

		// Add CodeMirror button to the enhanced editing toolbar.
		$textbox1.on( 'wikiEditor-toolbar-doneInitialSections', addCodeMirrorToWikiEditor );
		enableCodeMirror();


	} );

	// Synchronize textarea with CodeMirror before leaving
	window.addEventListener( 'beforeunload', function () {
		if ( codeMirror ) {
			codeMirror.save();
		}
	} );

	var value, orig1, orig2, panes = 3, highlight = true, connect = "align", collapse = true;

window.mergeMode = function(conten1, content2) {
//editor.getValue()
 connect = connect ? null : 'align';
document.body.classList.add('cm-live-mode');
 // if (value == null) return;
  var target = document.getElementById("wikiPreview");
  target.classList.add('merged');
target.setAttribute('style','');
  target.innerHTML = "";
  window.dv = CodeMirror.MergeView(target, {
    value: $('#wpTextbox1').val(),
    origLeft: panes == 3 ? conten1 : null,
    orig: content2,
    lineNumbers: true,
    mode: "htmlmixed",
    theme: editor.getOption("theme"),
    highlightDifferences: highlight,
    connect: connect,
    collapseIdentical: collapse
  });

  var mergeButton = document.createElement('div');
  mergeButton.innerHTML = "call_merge";
  mergeButton.setAttribute('class', 'material-icons text-center');
  mergeButton.setAttribute('onclick', 'saveMerge()');
  mergeButton.setAttribute('style', 'width: 100%;  transform: scaleY(-1);cursor:pointer');
    target.appendChild(mergeButton);
    let d = document.createElement("div"); d.style.cssText = "width: 50px; margin: 7px; height: 14px"; window.dv.editor().addLineWidget(57, d)

}

window.saveMerge = function(){
	editor.setValue(window.dv.editor().getValue());
	document.getElementById("wikiPreview").classList.add('merged');
	document.body.classList.remove('cm-live-mode');
	$('.CodeMirror-fullscreen').attr('style','')
    $('#wikiPreview').attr('style','');
    $('#wikiPreview').html('');
}

function toggleDifferences() {
  dv.setShowDifferences(highlight = !highlight);
}

//  value = document.documentElement.innerHTML;
//  orig1 = "<!doctype html>\n\n" + value.replace(/\.\.\//g, "codemirror/").replace("yellow", "orange");
//  orig2 = value.replace(/\u003cscript/g, "\u003cscript type=text/javascript ")
//    .replace("white", "purple;\n      font: comic sans;\n      text-decoration: underline;\n      height: 15em");
 // initUI();


function mergeViewHeight(mergeView) {
  function editorHeight(editor) {
    if (!editor) return 0;
    return editor.getScrollInfo().height;
  }
  return Math.max(editorHeight(mergeView.leftOriginal()),
                  editorHeight(mergeView.editor()),
                  editorHeight(mergeView.rightOriginal()));
}

function resize(mergeView) {
  var height = mergeViewHeight(mergeView);
  for(;;) {
    if (mergeView.leftOriginal())
      mergeView.leftOriginal().setSize(null, height);
    mergeView.editor().setSize(null, height);
    if (mergeView.rightOriginal())
      mergeView.rightOriginal().setSize(null, height);

    var newHeight = mergeViewHeight(mergeView);
    if (newHeight >= height) break;
    else height = newHeight;
  }
  mergeView.wrap.style.height = height + "px";
}

}() );
