#!/bin/bash

source .env

psql -h $PGHOST -p $PGPORT -U $PGUSER $PGDATABASE -f migrations/0001-initial.sql
