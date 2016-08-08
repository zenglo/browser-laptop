#
# Cookbook Name:: setup
# Recipe:: default
#
# Copyright 2016, YOUR_COMPANY_NAME
#
# All rights reserved - Do Not Redistribute
#

# vagrant_plugin 'vagrant-omnibus'
include_recipe 'build-essential::default'

case node['platform_family']
when 'windows'
when 'mac_os_x'
  remote_file "node-v6.3.1.pkg" do
     source "https://nodejs.org/download/release/v6.3.1/node-v6.3.1.pkg"
     action :create_if_missing
  end

  execute 'install-nodejs' do
    command 'installer -store -pkg "node-v6.3.1.pkg" -target "/"'
    creates '/usr/local/bin/node'
  end
end

# include_recipe 'vagrant'

# execute 'install-azure-dummy-box' do
#   command 'vagrant box add azure https://github.com/azure/vagrant-azure/raw/v2.0/dummy.box'
#   creates "#{Dir.home}/.vagrant.d/boxes/azure"
# end



# curl "https://nodejs.org/dist/latest/node-${VERSION:-$(wget -qO- https://nodejs.org/dist/latest/ | sed -nE 's|.*>node-(.*)\.pkg</a>.*|\1|p')}.pkg" > "$HOME/Downloads/node-latest.pkg" && sudo installer -store -pkg "$HOME/Downloads/node-latest.pkg" -target "/"

# https://nodejs.org/en/download/package-manager/
# include_recipe "nodejs::install_from_binary"
# https://nodejs.org/download/release/v6.3.1/node-v6.3.1-linux-x64.tar.xz
# https://nodejs.org/download/release/v6.3.1/node-v6.3.1-linux-x86.tar.gz
# https://nodejs.org/download/release/v6.3.1/node-v6.3.1-darwin-x64.tar.xz
# https://nodejs.org/download/release/v6.3.1/node-v6.3.1-x86.msi
# https://nodejs.org/download/release/v6.3.1/node-v6.3.1-x64.msi
# https://nodejs.org/download/release/v6.3.1/node-v6.3.1.pkg
# msiexec.exe /i node-v0.10.23-x64.msi INSTALLDIR="C:\Tools\NodeJS" /quiet
