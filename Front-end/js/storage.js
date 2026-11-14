const KEY='travelx';
const defaults={users:[],currentUser:null,favorites:[],bookings:[],theme:'dark',newsletter:[]};
export function read(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}}
export function write(data){localStorage.setItem(KEY,JSON.stringify({...read(),...data}))}
export function update(fn){const d=read();fn(d);write(d);return d}
export function activeUser(){const d=read();return d.users.find(x=>x.email===d.currentUser)||null}
