## Deployment

### Kubernetes Deployment

To deploy the application on a Kubernetes cluster, apply the `kubernetes.yaml` file using the following command:

```bash
kubectl apply -f Deployment/kubernetes.yaml
```


### Docker Deployment

To deploy the application using Docker, use the docker compose command with the provided `docker-compose.yaml` file:

```bash
docker compose up -d
```



## Env
Use the .env.example file as a template to create your own .env file with the necessary environment variables.
Make sure to set the X_OBJECT, HEADER_TEXT, LOCATIONS, PORT, and APP_LANG variables according to your preferences.
