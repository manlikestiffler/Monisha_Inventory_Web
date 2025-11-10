const Logo = () => (
  <div className="flex items-center space-x-3">
    <div className="relative group">
      <div className="w-10 h-10 bg-primary rounded-2xl shadow-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-500">
        <span className="text-3xl font-black text-primary-foreground font-[Inter] tracking-tighter transform -rotate-12 group-hover:rotate-0 transition-transform duration-500" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.1)' }}>
          M
        </span>
        <div className="absolute inset-0 bg-black/10 rounded-2xl group-hover:bg-black/0 transition-colors duration-500" />
      </div>
    </div>
    <div className="flex flex-col">
      <span className="text-xl font-bold tracking-tight text-foreground">
        MonishaIMS
      </span>
    </div>
  </div>
);

export default Logo;