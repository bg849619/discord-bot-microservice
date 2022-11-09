import React, {useState} from 'react';
import '../Assets/App.css';

import Header from './Header';
import DeploymentList from './DeploymentList';

function App() {
    const [deployments, setDeployments] = useState([]);
    const [pods, setPods] = useState([]);
    const [error, setError] = useState(null);

    let fetchData = () => {
        fetch('/api')
        .then(res => res.json())
        .then(data => {
            console.log(data);
        }).catch(err => {
            console.log(err);
            setError("Could not fetch resources.");
        });

        // Do it again.
        setTimeout(fetchData, 5000);
    }

    return (
    <div className='App'>
        <Header />
        <h2>Deployments</h2>
        <DeploymentList deployments={deployments} />
        <h2>Pods</h2>
        
    </div>
    )
}

export default App;