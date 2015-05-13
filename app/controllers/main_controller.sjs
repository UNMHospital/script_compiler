function init(){
	this.applyBehavior("MynaAuth",{
		whitelist:["Main.buildDependencies"],
		providers:Myna.Permissions.getAuthTypes(),
		redirectParams:{
			providers:"ldap_unmh",
			title:"Login: " + $application.displayName
		}
	});
}

function index(params){
	$FP.redirectTo({
		action:"list"
	});
}

function list(params){
	this.set({
		apps:$FP.config.mpagesDir.listFiles(function(f){
			return f.isDirectory() && new Myna.File(f,"index.html").exists();
		}).sortByCol('fileName',String.compareNatural)
	});
}

function convert(params){
	$req.timeout =0;
	var index = new Myna.File($FP.config.mpagesDir,params.projectRoot,params.id,"index.html");
	var debug = new Myna.File($FP.config.mpagesDir,params.projectRoot,params.id,"debug.html");
	var converted;

	if (!index.exists()) {
		$FP.redirectTo({
			action:"list",
			message:"Dude! That was totally heinous input."
		});
	}


	converted = new Myna.File($FP.config.mpagesDir,params.projectRoot,params.id,"_converted_index.html");

	var concatenated = new Myna.File($FP.config.mpagesDir,params.projectRoot,params.id,"compiled.js");
	//var compiled = new Myna.File($FP.config.mpagesDir,params.projectRoot,params.id,"compiled.js");
	converted.forceDelete();
	concatenated.forceDelete();
	//compiled.writeString("");
	var compiledAdded=false;
	var missingFiles =[];
	for (var line in index.getLineIterator()) {
		var parts;
		var script="";
		if ( (parts=line.match(/^\s*<script.*?src="(.*?)".*/)) ){
			script=parts[1];
			//Myna.printDump(parts)
			script = script.replace(/ext-all-debug/,"ext-all");
		}
		if (parts=line.match(/^\s*[<]!-- \$Compiled (.*) on .*-->\s*?$/)){
			script=parts[1];
			//TODO check for converted lines
		}


		if (script){
			if (!/(env.js|version.js|compiled.js)/.test(script)){
				if (!compiledAdded){
					converted.appendString(<ejs>
						<script type="text/javascript" src="../env.js"></script>
						<script type="text/javascript" src="compiled.js?dc=<%=Myna.createUuid()%>"></script>
					</ejs>+"\n")
					compiledAdded=true
				}
				converted.appendString(<ejs>
					<!-- $Compiled <%=script%> on date XXX -->
				</ejs>+"\n")
				var includeFile =new Myna.File($FP.config.mpagesDir,params.projectRoot,params.id,script);
				if (includeFile.exists()){
					concatenated.appendString(
						"{\n"
						+includeFile.readString()
						+"\n}"
					);
				} else {
					missingFiles.push(includeFile.javaFile.toString())
				}
			}
		} else {
			converted.appendString(line+"\n")
		}
	}

	converted.copyTo(index)
	converted.forceDelete();
	if (!params.list){
		$flash.set(<ejs>
			Yeah Boi! I totally converted that M-Dog.
			<@if missingFiles.length >
			<%=Myna.dump(missingFiles,"Missing include Files")%>
			</@if>
		</ejs>)
	}
}



function buildDependencies(params){ // entry point from ext apps
	var app = params.id;
	var paths = params.paths$object;
	//var list = params.list.split(",").map(function(className){
	var list = $req.data.list.split(",").map(function(className){
		var parts =className.split(".")
		var url;
		paths.getKeys().sort(function(a,b){
			return String.compareNumericReverse(a.listLen("."),b.listLen("."))
		})
		.some(function(path){
			var base = paths[path];
			var r = new RegExp("^"+path)
			if (r.test(className)){
				url = "{0}/{1}.js".format(
					base,
					className.after(path.length+1).replace(/\./g,"/")
				)
				return true
			}
		})

		return "<!-- $Compiled {0} on {1} -->".format(
			url,
			"date at time"
			//new Date().format("m/d/Y") +" at " +new Date().format("H:i:s")
		)
	}).join("\n")

	var debug = new Myna.File($FP.config.mpagesDir,params.projectRoot,params.id,"debug.html")
	var index = new Myna.File($FP.config.mpagesDir,params.projectRoot,params.id,"index.html")

	Myna.log("debug", "debug", debug.toString());
	Myna.log("debug", "index", index.toString());

	index.writeString("");
	var dontDoItTwice = false;

	var appJsFound=false
	for (line in debug.getLineIterator()) {
		var parts;
		var script=""


		if (parts=line.match(/^\s*[<]!-- \$Compiled (.*) on .*-->\s*?$/)){
			continue
		}

		Myna.log("debug", "getLineIterator appendingString", line);


		index.appendString(line+"\n")
		if (!dontDoItTwice && /^\s*<!-- compiled code here -->/.test(line)){
			dontDoItTwice = true;
			index.appendString(list+"\n")

		}

	}


	index.copyTo(debug)

	this.convert(params)
	this.renderContent("{}","text/javascript")
}