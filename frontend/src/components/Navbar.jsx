import { Link } from 'react-router-dom';
import logo from '../assets/2gofindz.png';

function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="2Go Findz home">
          <img src={logo} alt="2Go Findz" className="h-10 w-10" />
        </Link>
      </div>
    </header>
  );
}

export default Navbar;
