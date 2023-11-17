const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("map-container").appendChild(renderer.domElement);
camera.position.set(0, 50, 100);

const url = '../img/Belgium_Heightmap.tif';
fetch(url)
  .then(response => response.arrayBuffer())
  .then(arrayBuffer => GeoTIFF.fromArrayBuffer(arrayBuffer))
  .then(async tiff => {
    try {
      const image = tiff.getImage();
      console.log("GeoTIFF image:", image);

      // Check if fileDirectory is defined
      if (!image.fileDirectory) {
        throw new Error('Invalid GeoTIFF image or missing file directory');
      }

      // Get the dimensions of the GeoTIFF image from fileDirectory
      const width = image.fileDirectory.ImageWidth;
      const height = image.fileDirectory.ImageLength;

      console.log("GeoTIFF image dimensions:", width, height);

      // Load elevation data asynchronously
      const elevationData = await image.readRasters();
      console.log(elevationData);
      console.log(elevationData.length);

      // Calculate elevation scale based on the range of elevation values
      const minElevation = Math.min(...elevationData.flat());
      const maxElevation = Math.max(...elevationData.flat());
      const elevationScale = 50; // Adjust this value based on your preference

      // Create a plane buffer geometry with dimensions based on the elevation data
      const geometry = new THREE.PlaneGeometry(width, height, elevationData[0].length - 1, elevationData.length - 1);

      // Apply elevation from the GeoTIFF to the terrain geometry
      const vertices = geometry.attributes.position.array;

      // Check if the size matches the expected size
      if (elevationData.length * elevationData[0].length !== vertices.length / 3) {
        console.error('Mismatch in elevation data size and geometry size');
      } else {
        // Update vertices based on elevation data and scale
        for (let i = 0; i < elevationData.length; i++) {
          for (let j = 0; j < elevationData[i].length; j++) {
            const elevation = ((elevationData[i][j] - minElevation) / (maxElevation - minElevation)) * elevationScale;
            vertices[(i * elevationData[0].length + j) * 3 + 2] = elevation;
          }
        }

        geometry.attributes.position.needsUpdate = true; // Update the geometry
      }

      // Create a mesh with Phong material
      const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
      });
      const terrain = new THREE.Mesh(geometry, material);

      // Add the terrain to the scene
      scene.add(terrain);

      // Add a light to see the terrain
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(0, 1, 1).normalize();
      scene.add(light);

      // Set up animation
      const animate = function () {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };

      animate();

      // Handle window resize
      window.addEventListener("resize", () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(newWidth, newHeight);
      });
    } catch (error) {
      console.error("Error during initialization:", error);
    }
  })
  .catch(error => {
    console.error("Error loading GeoTIFF:", error);
  });
