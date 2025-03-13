import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-6 px-8">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <p className="text-sm">© mobice 2025</p>
        </div>
        
        <div className="flex space-x-6">
          <Link 
            href="/docs" 
            className="text-gray-300 hover:text-white transition-colors"
          >
            Docs
          </Link>
          
          <Link 
            href="https://x.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white transition-colors"
          >
            X
          </Link>
          
          <Link 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Github
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 