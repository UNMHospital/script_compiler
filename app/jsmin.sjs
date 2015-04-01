/* jsmin.c
   2012-01-09

Copyright (c) 2002 Douglas Crockford  (www.crockford.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

The Software shall be used for Good, not Evil.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/* 
	Converted to JS by Mark Porter (mark@porterpeople.com)
*/

function minify(src,dest){
	
	
	
	
	function b2c(b){
		return String.fromCharCode(b)//new java.lang.Byte(b).toString();
	}
	/* isAlphanum -- return true if the character is a letter, digit, underscore,
			dollar sign, or non-ASCII character.
	*/
	
	function isAlphanum(c){
		return ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') ||
			(c >= 'A' && c <= 'Z') || c == '_' || c == '$' || c == '\\' ||
			c.charCodeAt(0) > 126);
	}
	
	
	/* get -- return the next character from stdin. Watch out for lookahead. If
			the character is a control character, translate it to a space or
			linefeed.
	*/
	
	function get(){
		var c = theLookahead;
		theLookahead = EOF;
		
		if (c == EOF) {
			c = is.read();
			if (c == -1 ) return EOF
			c=b2c(c);
		}
		if (c >= ' ' || c == '\n') {
			return c;
		}
		if (c == '\r') {
			return '\n';
		}
		return ' ';
	}
	
	
	/* peek -- get the next character without getting it.
	*/
	
	
	function peek(){
		theLookahead = get();
		return theLookahead;
	}
	
	
	/* next -- get the next character, excluding comments. peek() is used to see
			if a '/' is followed by a '/' or '*'.
	*/
	
	function next(){
		
		var c = get();
		if  (c == '/') {
			switch (peek()) {
			case '/':
				for (;;) {
					c = get();
					if (c <= '\n') {
						return c;
					}
				}
			case '*':
				get();
				for (;;) {
					switch (get()) {
					case '*':
						if (peek() == '/') {
							get();
							return ' ';
						}
						break;
					case EOF:
						Myna.println( "Error: JSMIN Unterminated comment.\n");
						exit(1);
					}
				}
			default:
				return c;
			}
		}
		return c;
	}
	
	
	/* action -- do something! What you do is determined by the argument:
			1   Output A. Copy B to A. Get the next B.
			2   Copy B to A. Get the next B. (Delete A).
			3   Get the next B. (Delete B).
	   action treats a string as a single character. Wow!
	   action recognizes a regular expression if it is preceded by ( or , or =.
	*/
	
	function action(d){
		switch (d) {
		case 1:
			os.write(theA.charCodeAt(0));
		case 2:
			theA = theB;
			if (theA == '\'' || theA == '"' || theA == '`') {
				for (;;) {
					os.write(theA.charCodeAt(0));
					theA = get();
					if (theA == theB) {
						break;
					}
					if (theA == '\\') {
						os.write(theA.charCodeAt(0));
						theA = get();
					}
					if (theA == EOF) {
						Myna.println( "Error: JSMIN unterminated string literal.");
						exit(1);
					}
				}
			}
		case 3:
			theB = next();
			if (theB == '/' && (theA == '(' || theA == ',' || theA == '=' ||
								theA == ':' || theA == '[' || theA == '!' ||
								theA == '&' || theA == '|' || theA == '?' ||
								theA == '{' || theA == '}' || theA == ';' ||
								theA == '\n')) {
				os.write(theA.charCodeAt(0));
				os.write(theB.charCodeAt(0));
				for (;;) {
					theA = get();
					if (theA == '[') {
						for (;;) {
							os.write(theA.charCodeAt(0));
							theA = get();
							if (theA == ']') {
								break;
							}
							if (theA == '\\') {
								os.write(theA.charCodeAt(0));
								theA = get();
							}
							if (theA == EOF) {
								Myna.println(
									"Error: JSMIN unterminated set in Regular Expression literal.\n");
								exit(1);
							}
						}
					} else if (theA == '/') {
						break;
					} else if (theA =='\\') {
						os.write(theA.charCodeAt(0));
						theA = get();
					}
					if (theA == EOF) {
						Myna.println(
							"Error: JSMIN unterminated Regular Expression literal.\n");
						exit(1);
					}
					os.write(theA.charCodeAt(0));
				}
				theB = next();
			}
		}
	}
	
	
	/* jsmin -- Copy the input to the output, deleting the characters which are
			insignificant to JavaScript. Comments will be removed. Tabs will be
			replaced with spaces. Carriage returns will be replaced with linefeeds.
			Most spaces and linefeeds will be removed.
	*/
	var theA;
	var theB;
	var EOF = null;
	var theLookahead = EOF;
	var is = new Myna.File(src).getInputStream();
	var os = new Myna.File(dest).getOutputStream();
	if (peek() == 0xEF) {
		get();
		get();
		get();
	}
	theA = '\n';
	action(3);
	while (theA != EOF) {
		
		switch (theA) {
		case ' ':
			if (isAlphanum(theB)) {
				action(1);
			} else {
				action(2);
			}
			break;
		case '\n':
			switch (theB) {
			case '{':
			case '[':
			case '(':
			case '+':
			case '-':
				action(1);
				break;
			case ' ':
				action(3);
				break;
			default:
				if (isAlphanum(theB)) {
					action(1);
				} else {
					action(2);
				}
			}
			break;
		default:
			switch (theB) {
			case ' ':
				if (isAlphanum(theA)) {
					action(1);
					break;
				}
				action(3);
				break;
			case '\n':
				switch (theA) {
				case '}':
				case ']':
				case ')':
				case '+':
				case '-':
				case '"':
				case '\'':
				case '`':
					action(1);
					break;
				default:
					if (isAlphanum(theA)) {
						action(1);
					} else {
						action(3);
					}
				}
				break;
			default:
				action(1);
				break;
			}
		}
	}
	
}