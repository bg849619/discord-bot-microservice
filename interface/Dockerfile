FROM node:alpine AS frontend

WORKDIR /build

COPY /frontend ./

# Build the frontend source first.
# Install dependencies
RUN npm install
# Build bundle into /public
RUN npm run build

FROM golang:1.18-alpine

WORKDIR /app

COPY backend/go.mod ./
COPY backend/go.sum ./

RUN go mod download

COPY backend/*.go ./
# Copy built files from react into static folder.
COPY --from=frontend /build/public ./static 

RUN go build -o ./app

CMD ["./app"]