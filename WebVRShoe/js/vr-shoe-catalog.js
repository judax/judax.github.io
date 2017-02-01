/* global mat4, WGLUProgram */

window.VRShoeCatalog = (function () {
  "use strict";

  var shoeCatalogVS = [
    "uniform mat4 projectionMat;",
    "uniform mat4 modelViewMat;",
    "uniform mat3 normalMat;",
    "uniform vec2 texCoord;",
    "attribute vec3 position;",
    "attribute vec3 normal;",
    "varying vec2 vTexCoord;",
    "varying vec3 vLight;",

    "const vec3 lightDir = vec3(0.75, 0.5, 1.0);",
    "const vec3 ambientColor = vec3(0.5, 0.5, 0.5);",
    "const vec3 lightColor = vec3(0.75, 0.75, 0.75);",

    "void main() {",
    "  vec3 normalRotated = normalMat * normal;",
    "  float lightFactor = max(dot(normalize(lightDir), normalRotated), 0.0);",
    "  vLight = ambientColor + (lightColor * lightFactor);",
    "  vTexCoord = texCoord;",
    "  gl_Position = projectionMat * modelViewMat * vec4( position, 1.0 );",
    "}",
  ].join("\n");

  var shoeCatalogFS = [
    "precision mediump float;",
    "uniform sampler2D diffuse;",
    "varying vec2 vTexCoord;",
    "varying vec3 vLight;",

    "void main() {",
    "  gl_FragColor = vec4(vLight, 1.0) * texture2D(diffuse, vTexCoord);",
    "}",
  ].join("\n");

  /**
   * Generate a ring of n points around the origin with radius r.
   * @param {int} n The number of points to generate.
   * @param {int} r The radius of the ring.
   */
  var generateRing = (n, r) => {
    var coords = [];
    for (var i = 0; i < n; i++) {
      var x = Math.cos(2 * Math.PI / n * i) * r;
      var z = Math.sin(2 * Math.PI / n * i) * r;

      var translation = vec3.create();
      vec3.set(translation, x, 0, z);
      coords.push(translation);
    }
    return coords;
  };

  /**
   * Create a ShoeCatalog using the given model and shoe catalog data.
   *
   * @param gl The WebGL context.
   * @param texture The texture to use for the shoe.
   * @param shoeObj The shoe model.
   * @param shoeData The shoe catalog data.
   * @constructor
   */
  var ShoeCatalog = function(gl, texture, shoeObj, shoeData) {
    this.gl = gl;

    this.labelMat = mat4.create();
    this.labelOffset = vec3.create();
    vec3.set(this.labelOffset, -0.07, -0.05, 0);
    this.normalMat = mat3.create();
    this.heroRotationMat = mat4.create();
    mat4.identity(this.heroRotationMat);
    this.heroModelViewMat = mat4.create();
    mat4.identity(this.heroModelViewMat);
    this.translation = vec3.create();
    vec3.set(this.translation, 0, 0, -0.5);

    this.texture = texture;

    this.program = new WGLUProgram(gl);
    this.program.attachShaderSource(shoeCatalogVS, gl.VERTEX_SHADER);
    this.program.attachShaderSource(shoeCatalogFS, gl.FRAGMENT_SHADER);
    this.program.bindAttribLocation({
      position: 0,
      normal: 1,
      texCoord: 2
    });
    this.program.link();

    this.shoe = shoeObj;
    OBJ.initMeshBuffers(gl, this.shoe);

    this.shoeData = shoeData;

    this.textRenderer = new SevenSegmentText(gl);
  };

  /**
   * Draw a label for the given shoe at the given coord.
   *
   * @param {mat4} projectionMat The projection matrix.
   * @param {mat4} modelViewMat The model view matrix.
   * @param {Object} shoe The shoe data.
   * @param {vec3} coord The coordinates of the shoe.
   */
  ShoeCatalog.prototype.drawLabel = function(
      projectionMat, modelViewMat, shoe) {
    this.textRenderer.render(
        projectionMat, modelViewMat, shoe.name + " - " + shoe.price,
        1, 1, 1, 1);
  };

  /**
   * Draw a shoe at the given coord.
   *
   * @param {mat4} projectionMat The projection matrix.
   * @param {mat4} modelViewMat The model view matrix.
   * @param {vec2} texCoord The coordinates of the shoe.
   */
  ShoeCatalog.prototype.drawShoe = function(
      projectionMat, modelViewMat, texCoord) {
    var gl = this.gl;
    var program = this.program;

    this.program.use();

    this.gl.uniformMatrix4fv(
        this.program.uniform.projectionMat, false, projectionMat);

    mat3.identity(this.normalMat);
    gl.uniformMatrix3fv(program.uniform.normalMat, false, this.normalMat);

    gl.enableVertexAttribArray(program.attrib.position);
    gl.enableVertexAttribArray(program.attrib.normal);
    gl.disableVertexAttribArray(program.attrib.texCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.shoe.vertexBuffer);
    gl.vertexAttribPointer(program.attrib.position,
        this.shoe.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.shoe.normalBuffer);
    gl.vertexAttribPointer(program.attrib.normal,
        this.shoe.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.shoe.indexBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.program.uniform.diffuse, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    gl.uniformMatrix4fv(
        program.uniform.modelViewMat, false, modelViewMat);

    // We know that the additional model matrix is a pure rotation,
    // so we can just use the non-position parts of the matrix
    // directly, this is cheaper than the transpose+inverse that
    // normalFromMat4 would do.
    mat3.fromMat4(this.normalMat, this.heroModelViewMat);
    gl.uniformMatrix3fv(program.uniform.normalMat, false, this.normalMat);

    // Use the texture coordinates from the shoe catalog entry.
    gl.uniform2f(this.program.uniform.texCoord, texCoord.x, texCoord.y);
    gl.drawElements(
        gl.TRIANGLES, this.shoe.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  };

  /**
   * Render the shoe catalog.
   *
   * @param {mat4} projectionMat The projection matrix.
   * @param {mat4} modelViewMat The model view matrix.
   * @param {int} timestamp The current timestamp.
   */
  ShoeCatalog.prototype.render = function(
      projectionMat, modelViewMat, timestamp) {

    var timestamp = timestamp || 0;

    // Compute the shoe coordinates
    var shoeCoords = generateRing(this.shoeData.length, 0.9);

    for (var i = 0; i < this.shoeData.length; i++) {
      var shoe = this.shoeData[i];
      var coord = shoeCoords[i];

      // Determine the model view matrix to put the shoe around a ring.
      mat4.fromRotation(this.heroRotationMat, timestamp / 10000, [0, 1, 0]);
      mat4.translate(this.heroModelViewMat, modelViewMat, coord);
      mat4.multiply(
          this.heroModelViewMat, this.heroModelViewMat, this.heroRotationMat);
      // Render the shoe
      this.drawShoe(projectionMat, this.heroModelViewMat, shoe.color);

      // Determine the model view matrix to put the label under the shoe.
      mat4.identity(this.labelMat);
      // Move the label to the shoe.
      mat4.translate(this.labelMat, this.labelMat, coord);
      // Make the label face towards the center of the ring.
      var angle = Math.atan2(0, -1) - Math.atan2(coord[0], coord[2]);
      if (angle < 0) {
        angle += 2 * Math.PI;
      }
      mat4.rotateY(this.labelMat, this.labelMat, -angle);
      mat4.translate(this.labelMat, this.labelMat, this.labelOffset);
      mat4.scale(this.labelMat, this.labelMat, [0.01, 0.01, 0.01]);
      mat4.multiply(this.labelMat, modelViewMat, this.labelMat);
      this.drawLabel(projectionMat, this.labelMat, shoe);
    }
  };

  return ShoeCatalog;
})();
