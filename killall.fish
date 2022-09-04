#!/bin/fish
for id in $(fly machines list -a rust-mq | tail -n +6 | cut -f1)
    fly machines remove -a rust-mq $id --force &
end
