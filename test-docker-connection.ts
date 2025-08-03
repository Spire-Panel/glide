import Docker from 'dockerode';

async function testDockerConnection() {
  const dockerUrl = process.env['DOCKER_SOCKET_PATH'];
  let docker;

  console.log('Testing Docker connection to:', dockerUrl || 'default socket');

  if (dockerUrl?.match(/\.sock/)) {
    docker = new Docker({
      socketPath: dockerUrl,
    });
  } else {
    const url = new URL(dockerUrl?.startsWith('http') ? dockerUrl : `tcp://${dockerUrl}`);
    const protocol = url.protocol.replace(':', '') as 'http' | 'https' | 'ssh';
    docker = new Docker({
      protocol: protocol,
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 2375,
    });
  }

  try {
    console.log('Pinging Docker daemon...');
    await docker.ping();
    console.log('✅ Successfully connected to Docker daemon');
    
    console.log('\nListing containers:');
    const containers = await docker.listContainers();
    console.log(`Found ${containers.length} containers`);
    containers.forEach((container, i) => {
      console.log(`${i + 1}. ${container.Names?.[0] || 'unnamed'} (${container.Image})`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to Docker daemon:');
    console.error(error);
    process.exit(1);
  }
}

testDockerConnection().catch(console.error);
