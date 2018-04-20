function Sphera(positions, texture, textureCoord, normale, index, posBuffer, texBuffer, norBuffer, indBuffer, angle, radius, textureSource) {
  this.positions = positions;
  this.texture = texture;
  this.textureCoord = textureCoord;
  this.normale = normale;
  this.index = index;
  this.posBuffer = posBuffer;
  this.texBuffer = texBuffer;
  this.norBuffer = norBuffer;
  this.indBuffer = indBuffer;
  this.angle = angle;
  this.radius = radius;
  this.textureSource = textureSource;
}
Sphera.prototype.initCoords = function (delta) {
  this.normale = [];
  this.textureCoord = [];
  this.positions =[];
  this.index = [];
  for (var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
      var theta = latNumber * Math.PI / latitudeBands;
      var sinTheta = Math.sin(theta);
      var cosTheta = Math.cos(theta);

      for (var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
        var phi = longNumber * 2 * Math.PI / longitudeBands;
        var sinPhi = Math.sin(phi);
        var cosPhi = Math.cos(phi);

        var x = cosPhi * sinTheta;
        var y = cosTheta;
        var z = sinPhi * sinTheta;
        var u = 1 - (longNumber / longitudeBands);
        var v = 1 - (latNumber / latitudeBands);
        this.normale.push(x);
        this.normale.push(y);
        this.normale.push(z);
        this.textureCoord.push(u);
        this.textureCoord.push(v);
        this.positions.push((this.radius * x)-delta);
        this.positions.push((this.radius * y));
        this.positions.push((this.radius * z));
      }
    }
    for (var latNumber = 0; latNumber < latitudeBands; latNumber++) {
      for (var longNumber = 0; longNumber < longitudeBands; longNumber++) {
        var first = (latNumber * (longitudeBands + 1)) + longNumber;
        var second = first + longitudeBands + 1;
        this.index.push(first);
        this.index.push(second);
        this.index.push(first + 1);

        this.index.push(second);
        this.index.push(second + 1);
        this.index.push(first + 1);
      }
    }
};


var planet = new Sphera([],[],[],[],[],[],[],[],[],0,2.440,"images/mercury1.jpg");
var sun = new Sphera([],[],[],[],[],[],[],[],[],0,69.5508 ,"images/sun1.jpg");
var world = new Sphera([],[],[],[],[],[],[],[],[],0,10000,"images/cosmos1.jpg");

var dotsOfMercury = new Array();
var dotsOfMercuryIndex = new Array();
var dotsOfMercuryBuffer;
var dotsOfMercuryIndexBuffer;
var dotsOfMercuryTextureBuffer;
var i=0;
for(var k=0; k<=degToRad(360);k=k+degToRad(0.1)){
    var gipotenuza = Math.sqrt(Math.pow((387.09927*Math.sin(k)+(466.70079-387.09927)),2)+Math.pow(378.82223*Math.cos(k),2));
    dotsOfMercury[i]=gipotenuza*Math.sin(degToRad(60)-Math.atan2(378.82223*Math.cos(k),(387.09927*Math.sin(k)+(466.70079-387.09927))))*Math.cos(degToRad(7));
    dotsOfMercury[i+1]=gipotenuza*Math.sin(degToRad(60)-Math.atan2(378.82223*Math.cos(k),(387.09927*Math.sin(k)+(466.70079-387.09927))))*Math.sin(degToRad(7));
    dotsOfMercury[i+2]=gipotenuza*Math.cos(degToRad(60)-Math.atan2(378.82223*Math.cos(k),(387.09927*Math.sin(k)+(466.70079-387.09927))));
    i=i+3;
}
var mvMatrix = mat4.create();
var mvMatrixStack = [];//стек для матрицы при повороте
var pMatrix = mat4.create();
var rotationMatrix = mat4.create();
mat4.identity(rotationMatrix);

var sunSizeRange = document.querySelector(".sun-size");
var mercurySizeRange = document.querySelector(".mercury-size");
var chooseSpeed = document.querySelector(".speed");
var shaderProgram;

var canvas = document.querySelector("canvas");
canvas.width= window.innerWidth;
canvas.height= window.innerHeight;

var lastTime = 0;
var gl;
var latitudeBands = 100;
var longitudeBands = 100;

//пиксельные шейдеры
const fsSource1 = "precision mediump float; varying vec2 vTextureCoord; varying vec3 vTransformedNormal; varying vec4 vPosition; uniform float uMaterialShininess; uniform vec3 uAmbientColor; uniform vec3 uPointLightingLocation; uniform vec3 uPointLightingSpecularColor; uniform vec3 uPointLightingDiffuseColor; uniform sampler2D uSampler; void main(void) { vec3 lightWeighting; vec3 lightDirection = normalize(uPointLightingLocation - vPosition.xyz); vec3 normal = normalize(vTransformedNormal); float specularLightWeighting = 0.0; vec3 eyeDirection = normalize(-vPosition.xyz); vec3 reflectionDirection = reflect(-lightDirection, normal); specularLightWeighting = pow(max(dot(reflectionDirection, eyeDirection), 0.0), uMaterialShininess); float diffuseLightWeighting = max(dot(normal, lightDirection), 0.0); lightWeighting = uAmbientColor + uPointLightingSpecularColor *";
const fsSource2 ="specularLightWeighting + uPointLightingDiffuseColor * diffuseLightWeighting; vec4 fragmentColor; fragmentColor = texture2D(uSa"+"mpler, vec2(vTextureCoord.s, vTextureCoord.t));gl_FragColor = vec4(fragmentColor.rgb * lightWeighting, fragmentColor.a);}";
const fsSource = fsSource1 + fsSource2;
const vsSource = "attribute vec3 aVertexPosition; attribute vec3 aVertexNormal; attribute vec2 aTextureCoord; uniform mat4 uMVMatrix; uniform mat4 uPMatrix; uniform mat3 uNMatrix; varying vec2 vTextureCoord; varying vec3 vTransformedNormal; varying vec4 vPosition; void main(void) { vPosition = uMVMatrix * vec4(aVertexPosition, 1.0); gl_Position = uPMatrix * vPosition; vTextureCoord = aTextureCoord; vTransformedNormal = uNMatrix * aVertexNormal; }";

var p=0;
var pitch = 0;
var pitchRate = 0;
var yaw = 0;
var yawRate = 0;
var xPos = 0;
var yPos = 0.4;
var zPos = 0;
var speed = 0;
var joggingAngle = 0;

var currentlyPressedKeys = {};

function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

function handleKeyDown(event) {
        currentlyPressedKeys[event.keyCode] = true;
    }

function handleKeyUp(event) {
        currentlyPressedKeys[event.keyCode] = false;
    }

function handleKeys() {
    if (currentlyPressedKeys[33]) {
      // Page Up
      pitchRate = 0.1;
    } else if (currentlyPressedKeys[34]) {
      // Page Down
      pitchRate = -0.1;
    } else {
      pitchRate = 0;
    }

    if (currentlyPressedKeys[37] || currentlyPressedKeys[65]) {
      // Left cursor key or A
      yawRate = 0.1;
    } else if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
      // Right cursor key or D
      yawRate = -0.1;
    } else {
      yawRate = 0;
    }

    if (currentlyPressedKeys[38] || currentlyPressedKeys[87]) {
      // Up cursor key or W
      speed = 0.3;
    } else if (currentlyPressedKeys[40] || currentlyPressedKeys[83]) {
      // Down cursor key
      speed = -0.3;
    } else {
      speed = 0;
    }

  }

function mvPushMatrix() {//функция push для стека матриц
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
  }

function mvPopMatrix() {//функция push для стека матриц
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
  }

function initGL() {
  try {
              gl = canvas.getContext("webgl");
              gl.viewportWidth = canvas.width;
              gl.viewportHeight = canvas.height;
          } catch (e) {
          }
    if (!gl) {
      alert("Failed to get WebGL context. "
        + "Your browser or device may not support WebGL.");
        return;
    }
}

function loadShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
  }

function initShaders() {
      const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
      const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);

      shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);

      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
      }

      gl.useProgram(shaderProgram);
      //ссылка  на атрибут позиции
      shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
      gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

      /*ссылка на атрибут цвета
      shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
      gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);*/

      //ссылка на атрибут текстуры
      shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
      gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

      //ссылка на атрибут нормалей
      shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
      gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

      shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
      shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
      shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
      shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
      shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
      shaderProgram.pointLightingLocationUniform = gl.getUniformLocation(shaderProgram, "uPointLightingLocation");
      shaderProgram.pointLightingSpecularColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingSpecularColor");
      shaderProgram.pointLightingDiffuseColorUniform = gl.getUniformLocation(shaderProgram, "uPointLightingDiffuseColor");
      shaderProgram.materialShininessUniform = gl.getUniformLocation(shaderProgram, "uMaterialShininess");
    }

function setMatrixUniforms() {
          gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
          gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
          var normalMatrix = mat3.create();
          mat4.toInverseMat3(mvMatrix, normalMatrix);
          mat3.transpose(normalMatrix);
          gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
      }

function initTexture ( source) {
        var texture = gl.createTexture();
        texture.image = new Image();
        texture.image.onload = function() {
          gl.bindTexture(gl.TEXTURE_2D, texture);//назначается эта текущая текстура
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.bindTexture(gl.TEXTURE_2D, null);
        }
        texture.image.src = source;
        return texture;
      };

function initBuffers(array, typeArray, item, num) {
  var arrayBuffer = gl.createBuffer();
  if(typeArray=="array"){
  gl.bindBuffer(gl.ARRAY_BUFFER, arrayBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,
              new Float32Array(array),
              gl.STATIC_DRAW);
  }else{
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, arrayBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
                new Uint16Array(array),
                gl.STATIC_DRAW);
  }
  arrayBuffer.itemSize = item;
  arrayBuffer.numItems = num;
              return arrayBuffer;
  }

function InitIndex (count){
  var index = [];
  var lenght = 0;
  for(var j=0;j<count-1;j++){
    index[lenght]=j;
    index[lenght+1]=j+1;
    lenght=lenght+2;
  }
  return index;
}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(60, gl.viewportWidth / gl.viewportHeight, 0.001, 100000.0, pMatrix);
    mat4.identity(mvMatrix);

    mat4.translate(mvMatrix, [ 0.0, -10.0, -705.0]);
    mat4.rotate(mvMatrix, degToRad(-pitch), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(-yaw), [0, 1, 0]);
    mat4.translate(mvMatrix, [-xPos, -yPos, -zPos]);

    gl.uniform3f(shaderProgram.ambientColorUniform, 0.1, 0.1, 0.1);//фоновое освещение
    gl.uniform3f(shaderProgram.pointLightingLocationUniform, 0.0,0.0, -30.0);
    gl.uniform3f(shaderProgram.pointLightingSpecularColorUniform, 0.8, 0.8, 0.8);
    gl.uniform3f(shaderProgram.pointLightingDiffuseColorUniform, 0.8, 0.8, 0.8);
    gl.uniform1f(shaderProgram.materialShininessUniform, 3);

    mvPushMatrix();
    mat4.translate(mvMatrix, [dotsOfMercury[p], dotsOfMercury[p+1], dotsOfMercury[p+2]]);
    mat4.rotate(mvMatrix, degToRad(60), [-1,0,1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, planet.posBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, planet.posBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, planet.texBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, planet.texBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, planet.norBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, planet.norBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planet.indBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, planet.texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, planet.indBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();

    gl.uniform3f(shaderProgram.ambientColorUniform, 1, 1, 1);

    mvPushMatrix();

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dotsOfMercuryTextureBuffer);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, dotsOfMercuryBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, dotsOfMercuryBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, dotsOfMercuryIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.LINES, dotsOfMercuryIndexBuffer.numItems, gl.UNSIGNED_SHORT,0);

    mvPopMatrix();

    gl.uniform3f(shaderProgram.ambientColorUniform, 0.7, 0.7, 0.7);

    mvPushMatrix();

    mat4.rotate(mvMatrix, degToRad(sun.angle), [0, 1, 0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, sun.posBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sun.posBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, sun.texBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, sun.texBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, sun.norBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, sun.norBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sun.indBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sun.texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, sun.indBuffer.numItems, gl.UNSIGNED_SHORT, 0);

    mvPopMatrix();

    gl.bindBuffer(gl.ARRAY_BUFFER, world.posBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, world.posBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, world.texBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, world.texBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, world.norBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, world.norBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, world.indBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, world.texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, world.indBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    return p;
}

function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
      p= p+3*chooseSpeed.value;
    if(p<0) {p=p+dotsOfMercury.length;}
     if(p>=dotsOfMercury.length) {p=p-dotsOfMercury.length;}
      var elapsed = timeNow - lastTime;
      if (speed != 0) {
                xPos -= Math.sin(degToRad(yaw)) * speed * elapsed;
                zPos -= Math.cos(degToRad(yaw)) * speed * elapsed;

                joggingAngle += elapsed * 0.6; // 0.6 "fiddle factor" - makes it feel more realistic :-)
                yPos = Math.sin(degToRad(joggingAngle)) / 20 + 0.4;
            }

            yaw += yawRate * elapsed;
            pitch += pitchRate * elapsed;
    }
    lastTime = timeNow;
  }

function tick() {
    requestAnimFrame(tick);
    //if(sun.texture.image.src!="file:///D:/js/%D0%BA%D1%83%D1%80%D1%81%D0%BE%D0%B2%D0%B0/"+sun.textureSource){
    if(sun.texture.image.src.indexOf(sun.textureSource)==-1){
      sun.texture=initTexture(sun.textureSource);}
    if(planet.texture.image.src.indexOf(planet.textureSource)==-1){
    planet.texture=initTexture(planet.textureSource);}
    if(sun.radius/sunSizeRange.value!=69.5508){
      sun.radius = 69.5508*sunSizeRange.value;
      sun.initCoords(0);
      sun.posBuffer = initBuffers(sun.positions, "array", 3, sun.positions.length/3);
    }
    if(planet.radius/mercurySizeRange.value!=2.440){
      planet.radius = 2.440*mercurySizeRange.value;
      planet.initCoords(0);
      planet.posBuffer = initBuffers(planet.positions, "array", 3, planet.positions.length/3);
    }

    handleKeys();
    drawScene();
    animate();
}

function webGLStart() {
    initGL();
    initShaders();

    planet.texture=initTexture(planet.textureSource);
    planet.initCoords(0);
    planet.posBuffer = initBuffers(planet.positions, "array", 3, planet.positions.length/3);
    planet.texBuffer = initBuffers(planet.textureCoord, "array", 2, planet.textureCoord.length/2);
    planet.norBuffer = initBuffers(planet.normale, "array", 3, planet.normale.length/3);
    planet.indBuffer = initBuffers(planet.index, "element", 1, planet.index.length);

    sun.texture=initTexture(sun.textureSource);
    sun.initCoords(0);
    sun.posBuffer = initBuffers(sun.positions, "array", 3, sun.positions.length/3);
    sun.texBuffer = initBuffers(sun.textureCoord, "array", 2, sun.textureCoord.length/2);
    sun.norBuffer = initBuffers(sun.normale, "array", 3, sun.normale.length/3);
    sun.indBuffer = initBuffers(sun.index, "element", 1, sun.index.length);

    world.texture=initTexture(world.textureSource);
    world.initCoords(0);
    world.posBuffer = initBuffers(world.positions, "array", 3, world.positions.length/3);
    world.texBuffer = initBuffers(world.textureCoord, "array", 2, world.textureCoord.length/2);
    world.norBuffer = initBuffers(world.normale, "array", 3, world.normale.length/3);
    world.indBuffer = initBuffers(world.index, "element", 1, world.index.length);

    dotsOfMercuryTextureBuffer=initTexture("images/white.jpg");
    dotsOfMercuryIndex = InitIndex(dotsOfMercury.length/3);
    dotsOfMercuryBuffer = initBuffers(dotsOfMercury, "array", 3 ,dotsOfMercury.length);
    dotsOfMercuryIndexBuffer = initBuffers(dotsOfMercuryIndex, "element", 2, dotsOfMercuryIndex.length);

    gl.clearColor(1.0, 1.0, 1.0, 0.9);
    gl.enable(gl.DEPTH_TEST);

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    tick();
}


 $(document).ready(function(){
   $('.btn-menu').on('mouseenter',function(e){
     e.preventDefault();
     $('.nav-stacked').slideDown( "slow");
   });
   $('.menu').on('mouseleave',function(e){
     e.preventDefault();
     $('.nav-stacked').slideUp("slow");
   });
   $('.for-mercury').on('click',function(e){
     e.preventDefault();
     $('.menu-for-object').fadeIn("slow");
     $('.mercury').fadeIn("slow");
     $('.sun').fadeOut("slow");
     $('.about').fadeOut("slow");
     $('.back-for-about').fadeOut("slow");
   });
   $('.for-sun').on('click',function(e){
     e.preventDefault();
     $('.menu-for-object').fadeIn("slow");
     $('.sun').fadeIn("slow");
     $('.mercury').fadeOut("slow");
     $('.about').fadeOut("slow");
     $('.back-for-about').fadeOut("slow");
   });
   $('.for-about').on('click',function(e){
     e.preventDefault();
     $('.back-for-about').fadeIn("slow");
     $('.menu-for-object').fadeOut("slow");
     $('.about').fadeIn("slow");
     $('.mercury').fadeOut("slow");
     $('.sun').fadeOut("slow");
   });
   $('.btn-exit-mercury').on('click',function(e){
     e.preventDefault();
     $('.menu-for-object').fadeOut("slow");
     $('.mercury').fadeOut("slow");
   });
   $('.btn-exit-sun').on('click',function(e){
     e.preventDefault();
     $('.menu-for-object').fadeOut("slow");
     $('.sun').fadeOut("slow");
   });
   $('.sun-text-1').on('click',function(e){
     e.preventDefault();
     sun.textureSource="images/sun.jpg";
   });
   $('.sun-text-2').on('click',function(e){
     e.preventDefault();
     sun.textureSource="images/sun1.jpg";
   });
   $('.mercury-text-1').on('click',function(e){
     e.preventDefault();
     planet.textureSource="images/mercury.jpg";
   });
   $('.mercury-text-2').on('click',function(e){
     e.preventDefault();
     planet.textureSource="images/mercury1.jpg";
   });
 });
