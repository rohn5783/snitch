export function ProductLighting() {
  return (
    <>
      <ambientLight intensity={1.35} />
      <directionalLight position={[4, 6, 5]} intensity={3} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={1.6} color="#c6a575" />
      <spotLight position={[0, 5, 2]} intensity={12} angle={0.45} penumbra={0.85} />
    </>
  );
}
