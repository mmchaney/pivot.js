PIVOT_ROOT     = File.expand_path(File.dirname(__FILE__))
PIVOT_SRC_DIR  = File.join(PIVOT_ROOT, 'src')
PIVOT_DIST_DIR = File.join(PIVOT_ROOT, 'dist')

PIVOT_COMPONENTS = [
  'pivot',
  'util',
  'gallery',
  'photo',
  'flickr',
]

task :default => [:clean, :concat, :dist]

desc "Clean the distribution directory."
task :clean do
  rm_rf PIVOT_DIST_DIR
  mkdir PIVOT_DIST_DIR
end

def normalize_whitespace(filename)
  contents = File.readlines(filename)
  contents.each { |line| line.sub!(/\s+$/, "") }
  File.open(filename, "w") do |file|
    file.write contents.join("\n").sub(/(\n+)?\Z/m, "\n")
  end
end

desc "Strip trailing whitespace and ensure each file ends with a newline"
task :whitespace do
  Dir["*", "src/**/*", "test/**/*"].each do |filename|
    normalize_whitespace(filename) if File.file?(filename)
  end
end

desc "Concatenate source files to build pivot.js"
task :concat => :whitespace do |task, args|
  File.open(File.join(PIVOT_DIST_DIR, 'pivot.js'), 'w') do |f|
    f.puts PIVOT_COMPONENTS.map { |component|
      File.read File.join(PIVOT_SRC_DIR, "#{component}.js")
    }
  end
end

desc "Compile and minify css"
task :css do |task|
  require 'sass'

  File.open(File.join(PIVOT_DIST_DIR, 'pivot.css'), 'w') do |f|
    template_scss_content = File.read File.join(PIVOT_SRC_DIR, 'pivot.scss')
    f.puts Sass::Engine.new(template_scss_content, :syntax => :scss, :style => :expanded).to_css
  end

  File.open(File.join(PIVOT_DIST_DIR, 'pivot.min.css'), 'w') do |f|
    template_scss_content = File.read File.join(PIVOT_SRC_DIR, 'pivot.scss')
    f.puts Sass::Engine.new(template_scss_content, :syntax => :scss, :style => :compressed).to_css
  end
end

def uglifyjs(src, target)
  begin
    require 'uglifier'
  rescue LoadError => e
    if verbose
      puts "\nYou'll need the 'uglifier' gem for minification. Just run:\n\n"
      puts "  $ gem install uglifier"
      puts "\nand you should be all set.\n\n"
      exit
    end
    return false
  end
  puts "Minifying #{src} with UglifyJS..."
  File.open(target, "w"){|f| f.puts Uglifier.new.compile(File.read(src))}
end

def process_minified(src, target)
  cp target, File.join(PIVOT_DIST_DIR,'temp.js')
  msize = File.size(File.join(PIVOT_DIST_DIR,'temp.js'))
  `gzip -9 #{File.join(PIVOT_DIST_DIR,'temp.js')}`

  osize = File.size(src)
  dsize = File.size(File.join(PIVOT_DIST_DIR,'temp.js.gz'))
  rm_rf File.join(PIVOT_DIST_DIR,'temp.js.gz')

  puts "Original version: %.3fk" % (osize/1024.0)
  puts "Minified: %.3fk" % (msize/1024.0)
  puts "Minified and gzipped: %.3fk, compression factor %.3f" % [dsize/1024.0, osize/dsize.to_f]
end

desc "Generates a minified version for distribution, using UglifyJS."
task :dist do
  src, target = File.join(PIVOT_DIST_DIR,'pivot.js'), File.join(PIVOT_DIST_DIR,'pivot.min.js')
  uglifyjs src, target
  process_minified src, target
end
