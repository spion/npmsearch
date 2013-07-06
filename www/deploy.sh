git fetch origin
git stash
git checkout origin/$1
nac $NACNAME update
nac $NACNAME restart
