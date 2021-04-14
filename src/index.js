import React from 'react';
import ReactDOM from 'react-dom';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import configureStore from './store/configureStore';
import App from './components/App';
import 'bootstrap/dist/css/bootstrap.css';
import reportWebVitals from './reportWebVitals';

const store = configureStore();

ReactDOM.render(
	<React.StrictMode>
    <Provider store={configureStore()}>
      <App />
    </Provider>
		
	</React.StrictMode>,
	document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
